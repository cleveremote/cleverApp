import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useNavigation} from '@react-navigation/native';
import {hapticOptions} from '../../data/cycleTypes';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {hotspotService} from '../../../services/hotspot';
import {clearBoxConfigurationDraft} from './boxConfigurationDraft';
import {
	WifiStatus,
	hasJoined,
	isAuthFailure,
	pollUntil,
	waitForWifiStatus
} from '../../../services/http';
import {
	COLORS,
	Centered,
	LinkButton,
	PrimaryButton,
	accessStyles,
	openWifiSettings
} from './accessUi';

/**
 * Au-delà, la box ne rejoindra plus le réseau demandé : le réseau est hors de
 * portée, ou elle n'a jamais reçu la configuration.
 */
const SEARCH_TIMEOUT_MS = 90000;

/** Temps laissé au téléphone pour revenir sur le réseau demandé. */
const PHONE_JOIN_MS = 30000;
const PHONE_PROBE_INTERVAL_MS = 1500;

type Phase =
	/** Une des deux étapes est en cours. */
	| 'waiting'
	/** La box déclare être sur le réseau demandé : configuration confirmée. */
	| 'confirmed'
	/** Le réseau a refusé la box — clé Wi-Fi erronée. */
	| 'rejected'
	/** Le téléphone est resté sur un autre réseau : l'étape 1 n'a pas abouti. */
	| 'offNetwork'
	/** Rien de concluant après SEARCH_TIMEOUT_MS. */
	| 'unconfirmed';

type StepState = 'pending' | 'running' | 'done' | 'failed';

/** Où en sont les deux étapes de la bascule, telles qu'affichées. */
type Progress = {
	/** Étape 1 — le téléphone rejoint le réseau demandé. */
	phone: StepState;
	/** Étape 2 — la box y est trouvée et confirmée. */
	box: StepState;
};

/**
 * Sur quel réseau le téléphone a-t-il atterri après le point d'accès ?
 *
 * `unknown` n'est pas un échec : toutes les plateformes ne savent pas nommer le
 * réseau courant — iOS n'a pas de pilote hotspot et ne répond jamais. On passe
 * alors à l'étape suivante sans rien affirmer, et c'est la recherche de la box
 * qui tranchera. Seul `elsewhere` est un constat d'échec : le téléphone a
 * nommé son réseau, et ce n'est pas le bon.
 */
type PhoneOutcome =
	| {kind: 'joined'; ssid: string}
	| {kind: 'unknown'}
	| {kind: 'elsewhere'; ssid: string};

/**
 * Bascule du point d'accès de la box vers le Wi-Fi qui vient d'être configuré.
 *
 * Deux mouvements, dans cet ordre : le téléphone quitte le point d'accès pour
 * le réseau demandé, puis la box y est cherchée. L'inverse ne tient pas — tant
 * que le téléphone est sur le point d'accès, il n'a aucun chemin vers le réseau
 * domestique, et ne peut donc pas y constater quoi que ce soit.
 *
 * L'écran de configuration ne peut rien conclure de son côté : la box applique
 * sa configuration et répond souvent trop tard, voire pas du tout. Il délègue
 * ici, et c'est bien pour ça que cet écran remplace la pile d'appairage plutôt
 * que de s'y empiler : il n'y a plus rien à faire derrière.
 *
 * La confirmation porte sur ce que la box dit d'elle-même — `mode: 'client'`
 * sur le SSID demandé, connexion établie — et non sur le simple fait qu'elle
 * réponde. Une box retombée sur un réseau connu répondrait tout aussi bien, et
 * serait annoncée configurée sans l'être.
 */
export function BoxHandover(props: any) {
	const deviceName: string = props.route?.params?.deviceName ?? '';
	const ssid: string = props.route?.params?.ssid ?? '';

	const [phase, setPhase] = useState<Phase>('waiting');
	const [elapsed, setElapsed] = useState(0);
	/** Dernier état obtenu de la box, ou `null` si elle n'a jamais répondu. */
	const [status, setStatus] = useState<WifiStatus | null>(null);
	const [progress, setProgress] = useState<Progress>({
		phone: 'running',
		box: 'pending'
	});
	/** Réseau sur lequel le téléphone dit se trouver, quand il sait le dire. */
	const [phoneSsid, setPhoneSsid] = useState<string | null>(null);

	const mounted = useRef(true);
	// Chaque vérification annule la précédente : « Réessayer » ne doit pas
	// laisser deux boucles écrire la même phase.
	const attempt = useRef(0);

	const nav = useNavigation();

	/** Sortie normale : la pile d'appairage est morte, on la remplace. */
	const goToSignin = useCallback(() => {
		props.navigation.reset({
			index: 1,
			routes: [
				{name: 'Profiles'},
				{name: 'Signin', params: {profile: deviceName}}
			]
		});
	}, [deviceName, props.navigation]);

	/**
	 * Chemin de correction : rescanner le QR code.
	 *
	 * Repasser directement au formulaire ne servirait à rien — il parle à la box
	 * en HTTPS sans savoir rejoindre son point d'accès, et le téléphone n'y est
	 * plus. Le scanner, lui, relit les identifiants du hotspot dans le QR code
	 * et l'y ramène avant d'ouvrir le formulaire, que le brouillon rend déjà
	 * rempli. Corriger une clé Wi-Fi ne coûte donc qu'un scan.
	 */
	const goToScan = useCallback(() => {
		props.navigation.reset({
			index: 1,
			routes: [{name: 'Profiles'}, {name: 'ScanBox'}]
		});
	}, [props.navigation]);

	useEffect(() => {
		nav.setOptions({
			headerLeft: brandLogo,
			// Aucun retour en arrière : le formulaire et le scanner n'ont plus
			// de réseau pour travailler. La croix mène là où l'utilisateur
			// voulait aller.
			headerRight: () =>
				navigationHeader(goToSignin, 'arrow-alt-circle-right', false)
		});
	}, [goToSignin, nav]);

	/**
	 * Étape 1 — attendre que le téléphone soit revenu sur le réseau demandé.
	 *
	 * Le point d'accès est relâché par l'appelant juste avant ; le système met
	 * ensuite quelques secondes à retomber sur le Wi-Fi enregistré, et rien ne
	 * sert de chercher la box avant. Une fois passé, on sait au moins que
	 * l'échec de l'étape 2, s'il vient, ne s'expliquera pas par le téléphone.
	 */
	const waitForPhoneOnNetwork = useCallback(
		async (alive: () => boolean): Promise<PhoneOutcome> => {
			let last: string | null = null;

			const found = await pollUntil<string>(
				async () => {
					const current = await hotspotService.getCurrentSsid();
					if (!current) return undefined;

					last = current;
					setPhoneSsid(current);
					return sameNetwork(current, ssid) ? current : undefined;
				},
				{
					timeoutMs: PHONE_JOIN_MS,
					intervalMs: PHONE_PROBE_INTERVAL_MS,
					shouldContinue: alive
				}
			);

			if (found) return {kind: 'joined', ssid: found};
			// Jamais rien obtenu : la plateforme ne sait pas nommer son réseau.
			// Ce n'est pas un échec, seulement une absence d'information.
			return last ? {kind: 'elsewhere', ssid: last} : {kind: 'unknown'};
		},
		[ssid]
	);

	const verify = useCallback(async () => {
		attempt.current += 1;
		const current = attempt.current;
		const alive = () => mounted.current && attempt.current === current;

		setPhase('waiting');
		setElapsed(0);

		/** Fin de parcours : la phase, l'étape fautive, et le retour haptique. */
		const settle = (
			outcome: Exclude<Phase, 'waiting'>,
			seen: WifiStatus | null,
			steps: Progress
		) => {
			setStatus(seen);
			setProgress(steps);
			setPhase(outcome);
			// Confirmée, la saisie n'a plus à être retenue — et elle porte la clé
			// Wi-Fi et le mot de passe du compte.
			if (outcome === 'confirmed') clearBoxConfigurationDraft();
			ReactNativeHapticFeedback.trigger(
				outcome === 'confirmed'
					? 'notificationSuccess'
					: 'notificationWarning',
				hapticOptions
			);
		};

		// Étape 1 — le téléphone. Relâcher le point d'accès d'abord : tant que le
		// process y est rattaché, toute sonde partirait sur une interface morte,
		// et Android ne rendrait pas la main au réseau enregistré.
		setProgress({phone: 'running', box: 'pending'});
		setPhoneSsid(null);
		await hotspotService.disconnect();
		if (!alive()) return;

		const phone = await waitForPhoneOnNetwork(alive);
		if (!alive()) return;

		// Il a nommé son réseau, et ce n'est pas le bon : chercher la box
		// dessus n'aurait aucun sens. C'est à l'utilisateur de le déplacer.
		if (phone.kind === 'elsewhere') {
			return settle('offNetwork', null, {phone: 'failed', box: 'pending'});
		}

		// Étape 2 — la box, sur ce réseau.
		setProgress({phone: 'done', box: 'running'});
		setElapsed(0);

		const fromLan = await waitForWifiStatus({
			ssid,
			timeoutMs: SEARCH_TIMEOUT_MS,
			shouldContinue: alive
		});

		if (!alive()) return;
		const outcome = outcomeFor(fromLan, ssid);
		settle(outcome, fromLan, {
			phone: 'done',
			box: outcome === 'confirmed' ? 'done' : 'failed'
		});
	}, [ssid, waitForPhoneOnNetwork]);

	useEffect(() => {
		mounted.current = true;
		verify();

		return () => {
			mounted.current = false;
		};
	}, [verify]);

	// Une attente muette de 90 s laisse croire à un blocage ; le compteur dit
	// que quelque chose se passe encore.
	useEffect(() => {
		if (phase !== 'waiting') return;
		const timer = setInterval(() => setElapsed(value => value + 1), 1000);
		return () => clearInterval(timer);
	}, [phase]);

	const network = ssid || 'votre réseau Wi-Fi';
	const summary = SUMMARIES[phase];

	/**
	 * Les actions dépendent de la phase, mais la liste des étapes reste, elle,
	 * affichée dans tous les cas : c'est elle qui dit laquelle a échoué.
	 */
	const actions = () => {
		switch (phase) {
			case 'confirmed':
				return <PrimaryButton label="Se connecter" onPress={goToSignin} />;
			case 'rejected':
				return (
					<>
						<PrimaryButton
							label="Rescanner la box pour corriger"
							onPress={goToScan}
						/>
						<LinkButton
							label="Ouvrir les réglages Wi-Fi"
							onPress={openWifiSettings}
						/>
						<LinkButton
							label="Réessayer la vérification"
							onPress={() => verify()}
						/>
					</>
				);
			case 'offNetwork':
				return (
					<>
						<PrimaryButton
							label="Ouvrir les réglages Wi-Fi"
							onPress={openWifiSettings}
						/>
						<LinkButton
							label="Réessayer la vérification"
							onPress={() => verify()}
						/>
						<LinkButton
							label="Continuer quand même"
							onPress={goToSignin}
						/>
					</>
				);
			case 'unconfirmed':
				return (
					<>
						<PrimaryButton
							label="Réessayer la vérification"
							onPress={() => verify()}
						/>
						<LinkButton
							label="Ouvrir les réglages Wi-Fi"
							onPress={openWifiSettings}
						/>
						<LinkButton
							label="Rescanner la box pour corriger"
							onPress={goToScan}
						/>
						<LinkButton
							label="Continuer quand même"
							onPress={goToSignin}
						/>
					</>
				);
			default:
				return (
					<>
						<LinkButton
							label="Ouvrir les réglages Wi-Fi"
							onPress={openWifiSettings}
						/>
						<LinkButton
							label="Continuer sans attendre"
							onPress={goToSignin}
						/>
					</>
				);
		}
	};

	return (
		<Centered>
			<Icon name={summary.icon} size={40} color={summary.color} />
			<Text style={styles.title}>{summary.title}</Text>
			<Text style={styles.body}>
				{bodyFor({phase, progress, status, ssid, network, deviceName})}
			</Text>

			<View style={styles.card}>
				<Step
					index={1}
					state={progress.phone}
					label={`Le téléphone rejoint ${network}`}
					detail={phoneDetail(progress.phone, phoneSsid)}
				/>
				<Step
					index={2}
					state={progress.box}
					label={`La box rejoint ${network}`}
					detail={boxDetail(progress.box, status, ssid, elapsed)}
				/>
			</View>

			{actions()}
		</Centered>
	);
}

/** Une ligne de la liste d'étapes : son état, son libellé, son détail. */
const Step = ({
	index,
	state,
	label,
	detail
}: {
	index: number;
	state: StepState;
	label: string;
	detail: string;
}) => (
	<View style={[styles.step, state === 'pending' && styles.stepPending]}>
		<View style={styles.stepIcon}>
			{state === 'running' ? (
				<ActivityIndicator color={COLORS.primary} />
			) : (
				<Icon
					name={STEP_ICONS[state]}
					size={20}
					color={STEP_COLORS[state]}
				/>
			)}
		</View>
		<View style={styles.stepText}>
			<Text style={styles.stepLabel}>{`${index}. ${label}`}</Text>
			<Text style={styles.stepDetail}>{detail}</Text>
		</View>
	</View>
);

const STEP_ICONS: Record<StepState, string> = {
	pending: 'circle',
	running: 'circle',
	done: 'check-circle',
	failed: 'times-circle'
};

const STEP_COLORS: Record<StepState, string> = {
	pending: COLORS.primary,
	running: COLORS.primary,
	done: COLORS.success,
	failed: COLORS.danger
};

/** Icône, couleur et titre annonçant l'issue — ou l'attente en cours. */
const SUMMARIES: Record<Phase, {icon: string; color: string; title: string}> = {
	waiting: {icon: 'wifi', color: COLORS.primary, title: 'Bascule en cours'},
	confirmed: {
		icon: 'check-circle',
		color: COLORS.success,
		title: 'Box configurée'
	},
	rejected: {icon: 'key', color: COLORS.danger, title: 'Clé Wi-Fi refusée'},
	offNetwork: {
		icon: 'mobile-alt',
		color: COLORS.danger,
		title: "Le téléphone n'est pas sur le bon réseau"
	},
	unconfirmed: {
		icon: 'exclamation-triangle',
		color: COLORS.danger,
		title: "Box introuvable pour l'instant"
	}
};

/** Où en est la recherche de la box, et ce qu'elle a fini par dire. */
function boxDetail(
	state: StepState,
	status: WifiStatus | null,
	ssid: string,
	elapsed: number
): string {
	if (state === 'running') return `recherche de la box… ${elapsed} s`;

	if (state === 'done' && hasJoined(status, ssid)) {
		return `connectée — ${status.deviceState}`;
	}

	if (state === 'failed') {
		// Ce qu'elle a répondu vaut mieux qu'un « introuvable » : un `mode ap`
		// dit qu'elle n'a pas basculé, un autre SSID qu'elle s'est trompée de
		// réseau — deux pannes qui ne se corrigent pas pareil.
		return status
			? `mode ${status.mode} — ${status.deviceState}`
			: 'aucune réponse sur le réseau';
	}

	return 'en attente';
}

/** Sur quel réseau le téléphone se trouve, quand il consent à le dire. */
function phoneDetail(state: StepState, phoneSsid: string | null): string {
	if (state === 'running') {
		return phoneSsid
			? `actuellement sur « ${phoneSsid} »`
			: 'reconnexion au Wi-Fi…';
	}

	if (state === 'failed') {
		return phoneSsid ? `resté sur « ${phoneSsid} »` : 'réseau inconnu';
	}

	if (state === 'done') {
		return phoneSsid
			? `connecté à ${phoneSsid}`
			: 'réseau non vérifiable sur cette plateforme';
	}

	return 'en attente';
}

/** Le texte qui explique où l'on en est, ou pourquoi on s'est arrêté là. */
function bodyFor(args: {
	phase: Phase;
	progress: Progress;
	status: WifiStatus | null;
	ssid: string;
	network: string;
	deviceName: string;
}): string {
	const {phase, progress, status, ssid, network, deviceName} = args;

	switch (phase) {
		case 'confirmed':
			return `La box ${
				deviceName ? `« ${deviceName} » ` : ''
			}déclare être connectée à ${
				status?.ssid || network
			} et répond sur votre réseau.`;

		case 'rejected':
			return `La box a bien reçu la configuration, mais ${network} a rejeté la clé saisie. Elle a rouvert son point d'accès : rescannez son QR code pour l'y rejoindre et corriger la clé — le reste de votre saisie est conservé.`;

		case 'offNetwork':
			return `Le téléphone est resté sur un autre réseau que ${network}. Tant qu'il y est, la box reste hors de portée : reconnectez-le, puis relancez la vérification.`;

		case 'unconfirmed':
			return unconfirmedReason(status, ssid, network);

		default:
			return progress.phone === 'running'
				? `Le point d'accès de la box est relâché. Reconnectez le téléphone à ${network} s'il ne l'a pas déjà fait.`
				: `La box applique sa configuration et rejoint ${network}. On la cherche sur ce réseau.`;
	}
}

/** Deux noms de réseau désignent-ils le même ? */
function sameNetwork(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function outcomeFor(
	status: WifiStatus | null,
	ssid: string
): Exclude<Phase, 'waiting'> {
	if (hasJoined(status, ssid)) return 'confirmed';
	if (isAuthFailure(status)) return 'rejected';
	return 'unconfirmed';
}

/**
 * Pourquoi la configuration n'a pas pu être confirmée, aussi précisément que ce
 * qu'on a pu observer le permet — de « jamais jointe » à « jointe, mais sur un
 * autre réseau », qui ne se corrigent pas de la même façon.
 */
function unconfirmedReason(
	status: WifiStatus | null,
	ssid: string,
	network: string
): string {
	if (!status) {
		return `La configuration a bien été envoyée, mais la box ne répond pas encore sur ${network}. Vérifiez que le téléphone y est connecté — et que la clé Wi-Fi saisie était la bonne.`;
	}

	const reported = (status.ssid ?? '').trim();
	const onAnotherNetwork =
		status.mode === 'client' &&
		reported !== '' &&
		reported.toLowerCase() !== ssid.trim().toLowerCase();

	if (onAnotherNetwork) {
		return `La box répond, mais elle est connectée à « ${reported} » et non à ${network}.`;
	}

	// Reste le cas où elle annonce le bon réseau sans que la connexion soit
	// établie : c'est `deviceState` qui le dit, et le montrer évite d'avoir à
	// deviner entre une tentative en cours et une tentative perdue.
	return `La box répond, mais elle n'a pas encore rejoint ${network} (état : ${status.deviceState}).`;
}

/* eslint-disable react-native/no-unused-styles */
const styles = {
	...accessStyles,
	...StyleSheet.create({
		spinner: {marginTop: 25},
		progress: {color: COLORS.primary, fontSize: 14, marginTop: 10},
		step: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			paddingVertical: 10,
			gap: 12
		},
		// L'étape à venir reste lisible sans se disputer l'attention avec celle
		// qui tourne.
		stepPending: {opacity: 0.4},
		// Largeur fixe : l'indicateur d'activité et l'icône n'ont pas la même,
		// et les libellés sauteraient à chaque changement d'état.
		stepIcon: {width: 24, alignItems: 'center', paddingTop: 1},
		stepText: {flex: 1},
		stepLabel: {color: COLORS.primary, fontSize: 15},
		stepDetail: {
			color: COLORS.primary,
			fontSize: 13,
			opacity: 0.6,
			marginTop: 2
		}
	})
};

export default BoxHandover;
