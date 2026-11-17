import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import i18n from 'i18next';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {
	faPen,
	faRightToBracket,
	faRotateRight,
	faWifi
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../data/cycleTypes';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {hotspotService} from '../../../services/hotspot';
import {saveSigninData} from '../../components/common/RememberMeManager';
import {
	clearBoxConfigurationDraft,
	settlePendingConfiguration,
	takePendingProfile
} from './boxConfigurationDraft';
import {
	BoxMode,
	ConfigureErrorCode,
	ConfigureOutcome,
	ConfigureSend,
	boxLocationAfter,
	configureOutcome,
	boxUrl,
	getBoxMode,
	pollUntil
} from '../../../services/http';
import {probeSocketServer} from '../../../services/socket';
import {
	COLORS,
	OutlineButton,
	StepProgress,
	accessStyles,
	openWifiSettings,
	WifiSettingsLink
} from './accessUi';

/**
 * Au-delà, la box ne rejoindra plus le réseau demandé : le réseau est hors de
 * portée, ou elle n'a jamais reçu la configuration.
 */
const SEARCH_TIMEOUT_MS = 90000;

/**
 * Temps passé à interroger la box sur son point d'accès quand `configure` est
 * restée sans réponse, pour savoir si elle l'a reçue. Court : si elle l'a
 * reçue, elle a déjà quitté ce point d'accès et ne répondra pas.
 */
const RECEIPT_PROBE_MS = 8000;
const RECEIPT_PROBE_INTERVAL_MS = 1500;

/**
 * Temps laissé au serveur local de la box pour accepter une connexion. Elle
 * vient de changer de réseau : il peut encore être en train de démarrer.
 */
const SERVER_TIMEOUT_MS = 40000;
const SERVER_PROBE_INTERVAL_MS = 2000;

/** Temps laissé au téléphone pour revenir sur le réseau demandé. */
const PHONE_JOIN_MS = 30000;
const PHONE_PROBE_INTERVAL_MS = 1500;

type Phase =
	/** Une des étapes est en cours. */
	| 'waiting'
	/** La box déclare la configuration appliquée, et son serveur local répond. */
	| 'confirmed'
	/** La box a refusé la configuration, ou n'a pas pu l'appliquer. */
	| 'failed'
	/** Le téléphone est resté sur un autre réseau : l'étape 2 n'a pas abouti. */
	| 'offNetwork'
	/** Rien de concluant après SEARCH_TIMEOUT_MS. */
	| 'unconfirmed'
	/** Box configurée, mais son serveur local n'a pas répondu à temps. */
	| 'serverUnreachable';

type StepState = 'pending' | 'running' | 'done' | 'failed';

/** Où en sont les étapes de la bascule, telles qu'affichées. */
type Progress = {
	/** Étape 1 — `configure` est envoyée, et la box l'autorise. */
	send: StepState;
	/** Étape 2 — le téléphone rejoint le réseau demandé. */
	phone: StepState;
	/** Étape 3 — la box y est trouvée, et dit ce qu'est devenue la configuration. */
	box: StepState;
	/** Étape 4 — le serveur local de la box accepte une connexion websocket. */
	server: StepState;
};

/**
 * Pourquoi la configuration a échoué. `onHotspot` : constaté avant d'avoir
 * relâché le point d'accès — le formulaire peut alors être rouvert tel quel,
 * sans repasser par le scanner.
 */
type Failure = {
	code: ConfigureErrorCode | 'NOT_RECEIVED';
	onHotspot: boolean;
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
 * L'écran de configuration ouvre celui-ci au moment où il envoie `configure`,
 * sans en attendre la réponse. Quatre mouvements, dans cet ordre : la box
 * reçoit la configuration, le téléphone quitte le point d'accès pour le réseau
 * demandé, la box y est cherchée, puis son serveur local est essayé. Chercher la box avant ne tient pas —
 * tant que le téléphone est sur le point d'accès, il n'a aucun chemin vers le
 * réseau domestique.
 *
 * Tout ce qui suit l'envoi se lit dans `getMode` : la box y publie le résultat
 * de `configure` — en cours, réussie, ou échouée avec son code. La confirmation
 * porte donc sur ce que la box dit de cette configuration-là, et non sur le
 * simple fait qu'elle réponde.
 */
/**
 * Crée le profil de la box, maintenant qu'elle est confirmée sur le réseau.
 *
 * Seulement à ce moment-là : une bascule qui échoue ne doit laisser aucun
 * profil derrière elle. Sans l'attendre : le trousseau peut demander une
 * authentification (biométrie Android) ou afficher une alerte (iOS sans code),
 * et rien de cela ne doit retenir l'écran. Son échec n'est pas non plus un
 * échec de la box.
 */
function saveConfirmedProfile(): void {
	const profile = takePendingProfile();
	if (!profile) return;
	const {deviceName, login, password} = profile;
	saveSigninData(deviceName, login, login, password, true, '').catch(e =>
		console.warn('[BoxHandover] saveSigninData:', e)
	);
}

export function BoxHandover(props: any) {
	const deviceName: string = props.route?.params?.deviceName ?? '';
	const ssid: string = props.route?.params?.ssid ?? '';
	// Identifiant choisi à la configuration : la connexion l'affiche figé.
	const login: string = props.route?.params?.login ?? '';
	const deviceId: string | undefined = props.route?.params?.deviceId;
	// `configure.startedAt` lu avant l'envoi : un résultat qui le porte encore
	// est celui d'une tentative précédente.
	const staleStartedAt: string | null =
		props.route?.params?.staleStartedAt ?? null;
	// Nombre d'étapes de l'assistant, dont celle-ci est la dernière : le
	// formulaire l'affiche à sa place une fois la configuration envoyée.
	const stepTotal: number = props.route?.params?.stepTotal ?? 0;

	const [phase, setPhase] = useState<Phase>('waiting');
	const [elapsed, setElapsed] = useState(0);
	/** Dernier mode lu sur la box, ou `null` si elle n'a jamais répondu. */
	const [boxMode, setBoxMode] = useState<BoxMode | null>(null);
	/** Réponse de la box à `configure`, une fois connue. */
	const [send, setSend] = useState<ConfigureSend | null>(null);
	const [failure, setFailure] = useState<Failure | null>(null);
	const [progress, setProgress] = useState<Progress>({
		send: 'running',
		phone: 'pending',
		box: 'pending',
		server: 'pending'
	});
	/** Réseau sur lequel le téléphone dit se trouver, quand il sait le dire. */
	const [phoneSsid, setPhoneSsid] = useState<string | null>(null);

	const mounted = useRef(true);
	// Chaque vérification annule la précédente : « Réessayer » ne doit pas
	// laisser deux boucles écrire la même phase.
	const attempt = useRef(0);

	const {t} = useTranslation('access');
	const nav = useNavigation();

	/** Sortie normale : la pile d'appairage est morte, on la remplace. */
	const goToSignin = useCallback(() => {
		// Encore tenu si l'on sort avant la fin de l'envoi, ou après un refus.
		hotspotService.disconnect().catch(() => undefined);
		props.navigation.reset({
			index: 1,
			routes: [
				{name: 'Profiles'},
				{name: 'Signin', params: {profile: deviceName, login}}
			]
		});
	}, [deviceName, login, props.navigation]);

	// Box configurée : retour à la liste des profils, où elle figure désormais.
	const goToProfiles = useCallback(() => {
		hotspotService.disconnect().catch(() => undefined);
		props.navigation.reset({index: 0, routes: [{name: 'Profiles'}]});
	}, [props.navigation]);

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

	/**
	 * Retour direct au formulaire, pour un échec constaté sur le point d'accès :
	 * le téléphone y est encore, la box aussi. Le brouillon rend la saisie, et
	 * `code` dit au formulaire ce qui est à corriger.
	 */
	const goToForm = useCallback(
		(code: Failure['code']) => {
			props.navigation.reset({
				index: 1,
				routes: [
					{name: 'Profiles'},
					{name: 'BoxConfiguration', params: {deviceId, configureError: code}}
				]
			});
		},
		[deviceId, props.navigation]
	);

	const canSignIn =
		progress.phone === 'done' &&
		progress.box === 'done' &&
		progress.server === 'done';

	useEffect(() => {
		nav.setOptions({
			// Même en-tête que les étapes du formulaire, dont celle-ci est la
			// suite.
			headerLeft: brandLogo,
			// Quitter l'assistant : retour à la liste des profils. Aucun retour
			// en arrière — le formulaire et le scanner n'ont plus de réseau pour
			// travailler.
			headerRight: () => navigationHeader(goToProfiles, 'list', false)
		});
	}, [goToProfiles, nav]);

	/**
	 * Étape 2 — attendre que le téléphone soit revenu sur le réseau demandé.
	 *
	 * Le point d'accès est relâché par l'appelant juste avant ; le système met
	 * ensuite quelques secondes à retomber sur le Wi-Fi enregistré, et rien ne
	 * sert de chercher la box avant. Une fois passé, on sait au moins que
	 * l'échec de l'étape 3, s'il vient, ne s'expliquera pas par le téléphone.
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
		const settle = (outcome: Exclude<Phase, 'waiting'>, steps: Progress) => {
			setProgress(steps);
			setPhase(outcome);
			// Confirmée, la saisie n'a plus à être retenue — et elle porte la clé
			// Wi-Fi et le mot de passe du compte.
			if (outcome === 'confirmed') {
				clearBoxConfigurationDraft();
				saveConfirmedProfile();
			}
			ReactNativeHapticFeedback.trigger(
				outcome === 'confirmed'
					? 'notificationSuccess'
					: 'notificationWarning',
				hapticOptions
			);
		};

		const fail = (reason: Failure, steps: Progress) => {
			setFailure(reason);
			settle('failed', steps);
		};

		/** Une lecture de `getMode`, ou `undefined` si la box n'a pas répondu. */
		const readOutcome = async (): Promise<ConfigureOutcome | undefined> => {
			const mode = await getBoxMode(deviceId);
			if (!mode || !alive()) return undefined;
			setBoxMode(mode);
			return configureOutcome(mode, staleStartedAt);
		};

		// Étape 1 — l'envoi. `configure` est partie à l'ouverture de cet écran :
		// le hotspot reste tenu tant qu'elle n'a pas abouti.
		setProgress({
			send: 'running',
			phone: 'pending',
			box: 'pending',
			server: 'pending'
		});
		setFailure(null);
		setBoxMode(null);
		setPhoneSsid(null);
		const sent: ConfigureSend = (await settlePendingConfiguration()) ?? {
			kind: 'lost'
		};
		if (!alive()) return;
		setSend(sent);

		const sendFailed: Progress = {
			send: 'failed',
			phone: 'pending',
			box: 'pending',
			server: 'pending'
		};
		// Refusée : la box n'a rien commencé, et n'a pas quitté son point
		// d'accès.
		if (sent.kind === 'refused') {
			return fail({code: sent.code, onHotspot: true}, sendFailed);
		}

		// L'autorisation se lit dans `getMode` : un mot de passe refusé y est
		// publié (`INVALID_CURRENT_PASSWORD`) sans que la box quitte son point
		// d'accès. On l'y interroge donc tant qu'elle y répond encore — ce qui
		// dit aussi, quand `configure` est restée sans réponse, si elle l'a
		// reçue.
		let answered = false;
		const receipt = await pollUntil<ConfigureOutcome | 'gone'>(
			async () => {
				const read = await readOutcome();
				// Elle répondait, elle ne répond plus : elle est partie
				// rejoindre le Wi-Fi.
				if (!read) return answered ? 'gone' : undefined;
				answered = true;
				if (read.kind === 'failed' || read.kind === 'succeeded') return read;
				// Acceptée, elle n'a simplement pas encore publié son résultat.
				if (read.kind === 'notApplied' && sent.kind === 'lost') return read;
				return undefined;
			},
			{
				timeoutMs: RECEIPT_PROBE_MS,
				intervalMs: RECEIPT_PROBE_INTERVAL_MS,
				shouldContinue: alive
			}
		);
		if (!alive()) return;
		if (receipt !== 'gone' && receipt?.kind === 'notApplied') {
			return fail({code: 'NOT_RECEIVED', onHotspot: true}, sendFailed);
		}
		if (receipt !== 'gone' && receipt?.kind === 'failed') {
			return fail({code: receipt.code, onHotspot: true}, sendFailed);
		}

		// Étape 2 — le téléphone. Relâcher le point d'accès d'abord : tant que le
		// process y est rattaché, toute sonde partirait sur une interface morte,
		// et Android ne rendrait pas la main au réseau enregistré.
		setProgress({
			send: 'done',
			phone: 'running',
			box: 'pending',
			server: 'pending'
		});
		await hotspotService.disconnect();
		if (!alive()) return;

		const phone = await waitForPhoneOnNetwork(alive);
		if (!alive()) return;

		// Il a nommé son réseau, et ce n'est pas le bon : chercher la box
		// dessus n'aurait aucun sens. C'est à l'utilisateur de le déplacer.
		if (phone.kind === 'elsewhere') {
			return settle('offNetwork', {
				send: 'done',
				phone: 'failed',
				box: 'pending',
				server: 'pending'
			});
		}

		// Étape 3 — la box. `getMode` est relu jusqu'à ce qu'elle rende un
		// verdict sur la configuration.
		setProgress({
			send: 'done',
			phone: 'done',
			box: 'running',
			server: 'pending'
		});
		setElapsed(0);

		const outcome = await pollUntil(
			async () => {
				const read = await readOutcome();
				if (!read || read.kind === 'pending') return undefined;
				// Acceptée, elle ne peut pas ne pas l'avoir reçue : c'est une
				// lecture faite avant qu'elle ne publie son résultat.
				if (read.kind === 'notApplied' && sent.kind === 'accepted') {
					return undefined;
				}
				return read;
			},
			{timeoutMs: SEARCH_TIMEOUT_MS, shouldContinue: alive}
		);
		if (!alive()) return;

		const boxFailed: Progress = {
			send: 'done',
			phone: 'done',
			box: 'failed',
			server: 'pending'
		};
		switch (outcome?.kind) {
			case 'succeeded':
				break;
			case 'failed':
				return fail(
					{code: outcome.code, onHotspot: false},
					// Mot de passe refusé : c'est l'autorisation qui a échoué,
					// pas la connexion de la box au Wi-Fi.
					outcome.code === 'INVALID_CURRENT_PASSWORD'
						? {
								send: 'failed',
								phone: 'done',
								box: 'pending',
								server: 'pending'
						  }
						: boxFailed
				);
			case 'notApplied':
				return fail({code: 'NOT_RECEIVED', onHotspot: false}, boxFailed);
			default:
				return settle('unconfirmed', boxFailed);
		}

		// Étape 4 — le serveur local. La box est sur le réseau ; reste à savoir
		// si l'application pourra s'y connecter. Une connexion websocket est
		// ouverte puis refermée aussitôt, et retentée tant qu'elle échoue.
		setProgress({send: 'done', phone: 'done', box: 'done', server: 'running'});
		setElapsed(0);

		const reachable = await pollUntil<true>(
			async () => {
				const url = await boxUrl('/', deviceId);
				const responded = await probeSocketServer(
					url.replace(/\/$/, ''),
					deviceId ? {boxId: deviceId} : undefined
				);
				return responded ? true : undefined;
			},
			{
				timeoutMs: SERVER_TIMEOUT_MS,
				intervalMs: SERVER_PROBE_INTERVAL_MS,
				shouldContinue: alive
			}
		);
		if (!alive()) return;

		return settle(reachable ? 'confirmed' : 'serverUnreachable', {
			send: 'done',
			phone: 'done',
			box: 'done',
			server: reachable ? 'done' : 'failed'
		});
	}, [deviceId, staleStartedAt, waitForPhoneOnNetwork]);

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

	const network = ssid || t('handover.yourNetwork');
	const summary = SUMMARIES[phase];
	// Sans accusé de réception, l'envoi reste incertain tant que le téléphone
	// n'a pas rejoint le réseau ; une fois l'étape 2 passée, il compte pour
	// réussi — si la box ne l'a pas reçu, c'est l'étape 3 qui le dira.
	const sendConfirmed = send?.kind === 'accepted' || progress.phone === 'done';

	/**
	 * Correction de la saisie. Depuis le point d'accès, le formulaire se rouvre
	 * tel quel ; ailleurs, il faut repasser par le scanner, qui y ramène le
	 * téléphone avant de rouvrir le formulaire.
	 */
	const fixInput = (
		<OutlineButton
			label={t('handover.fixInput')}
			icon={faPen}
			onPress={() =>
				failure?.onHotspot ? goToForm(failure.code) : goToScan()
			}
		/>
	);

	/**
	 * Connexion : visible pendant les vérifications, mais active seulement une
	 * fois les trois dernières passées — avant, rien ne dit que la box
	 * répondra.
	 */
	const signInButton = (
		<OutlineButton
			label={t('handover.signIn')}
			icon={faRightToBracket}
			disabled={!canSignIn}
			onPress={goToSignin}
		/>
	);

	/**
	 * Les actions dépendent de la phase, mais la liste des étapes reste, elle,
	 * affichée dans tous les cas : c'est elle qui dit laquelle a échoué.
	 */
	const actions = () => {
		switch (phase) {
			case 'confirmed':
				return signInButton;
			case 'failed':
				// Wi-Fi rejoint, ou échec constaté sur le point d'accès : le
				// téléphone n'a pas de réseau à changer.
				if (
					failure?.onHotspot ||
					(failure && locationAfter(failure) === 'lan')
				) {
					return fixInput;
				}
				return (
					<>
						{fixInput}
						<WifiSettingsLink />
					</>
				);
			case 'offNetwork':
				return (
					<>
						<OutlineButton
							label={t('openWifiSettings')}
							icon={faWifi}
							onPress={openWifiSettings}
						/>
						{fixInput}
					</>
				);
			case 'serverUnreachable':
				return (
					<>
						<OutlineButton
							label={t('handover.retry')}
							icon={faRotateRight}
							onPress={verify}
						/>
						{fixInput}
					</>
				);
			case 'unconfirmed':
				return (
					<>
						{fixInput}
						<WifiSettingsLink />
					</>
				);
			default:
				return (
					<>
						{signInButton}
						<WifiSettingsLink />
					</>
				);
		}
	};

	return (
		// Même mise en page que les étapes du formulaire, dont celle-ci est la
		// suite : pastille, progression de l'assistant, titre, puis la carte.
		<ScrollView
			style={styles.screen}
			contentContainerStyle={styles.screenContent}>
			<View style={[styles.badge, {borderColor: summary.color}]}>
				<Icon name={summary.icon} size={26} color={summary.color} />
			</View>
			{stepTotal > 1 ? (
				<StepProgress index={stepTotal - 1} total={stepTotal} />
			) : null}
			<Text style={styles.title}>{t(summary.title)}</Text>
			<Text style={styles.body}>
				{bodyFor({phase, progress, boxMode, failure, network, deviceName})}
			</Text>

			<View style={styles.card}>
				<Step
					index={1}
					state={progress.send}
					label={t('handover.authorizeAndSend')}
					// Partie, mais la box n'en a pas accusé réception.
					warning={progress.send === 'done' && !sendConfirmed}
					detail={sendDetail(progress.send, sendConfirmed, failure)}
				/>
				<Step
					index={2}
					state={progress.phone}
					label={t('handover.phoneJoins', {network})}
					detail={phoneDetail(progress.phone, phoneSsid)}
				/>
				<Step
					index={3}
					state={progress.box}
					label={t('handover.boxJoins', {network})}
					detail={boxDetail(progress.box, boxMode, failure, elapsed)}
				/>
				<Step
					index={4}
					state={progress.server}
					label={t('handover.serverReachable')}
					detail={serverDetail(progress.server, elapsed)}
				/>
			</View>

			{actions()}
		</ScrollView>
	);
}

/** Une ligne de la liste d'étapes : son état, son libellé, son détail. */
const Step = ({
	index,
	state,
	label,
	detail,
	warning
}: {
	index: number;
	state: StepState;
	label: string;
	detail: string;
	/** Étape passée sans certitude : point d'exclamation au lieu de la coche. */
	warning?: boolean;
}) => (
	<View style={[styles.step, state === 'pending' && styles.stepPending]}>
		<View style={styles.stepIcon}>
			{state === 'running' ? (
				<ActivityIndicator color={COLORS.primary} />
			) : (
				<Icon
					name={warning ? 'exclamation-circle' : STEP_ICONS[state]}
					size={20}
					color={warning ? COLORS.warning : STEP_COLORS[state]}
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
const SUMMARIES: Record<
	Phase,
	{icon: string; color: string; title: `handover.title.${Phase}`}
> = {
	waiting: {icon: 'wifi', color: COLORS.primary, title: 'handover.title.waiting'},
	confirmed: {
		icon: 'check-circle',
		color: COLORS.success,
		title: 'handover.title.confirmed'
	},
	failed: {
		icon: 'times-circle',
		color: COLORS.danger,
		title: 'handover.title.failed'
	},
	offNetwork: {
		icon: 'mobile-alt',
		color: COLORS.danger,
		title: 'handover.title.offNetwork'
	},
	unconfirmed: {
		icon: 'exclamation-triangle',
		color: COLORS.danger,
		title: 'handover.title.unconfirmed'
	},
	serverUnreachable: {
		icon: 'server',
		color: COLORS.danger,
		title: 'handover.title.serverUnreachable'
	}
};

/** Où joindre la box après cet échec. */
function locationAfter(failure: Failure) {
	return failure.code === 'NOT_RECEIVED'
		? 'unknown'
		: boxLocationAfter(failure.code);
}

/** Ce que la box a répondu à l'envoi de la configuration. */
function sendDetail(
	state: StepState,
	confirmed: boolean,
	failure: Failure | null
): string {
	if (state === 'running') return i18n.t('access:handover.send.sending');
	if (state === 'done') {
		return confirmed
			? i18n.t('access:handover.send.accepted')
			: i18n.t('access:handover.send.unconfirmed');
	}
	if (state === 'failed') {
		return failure?.code === 'NOT_RECEIVED'
			? i18n.t('access:handover.send.notReceived')
			: i18n.t('access:handover.send.refused');
	}
	return i18n.t('access:handover.pending');
}

/** Où en est la recherche de la box, et ce qu'elle a fini par dire. */
function boxDetail(
	state: StepState,
	boxMode: BoxMode | null,
	failure: Failure | null,
	elapsed: number
): string {
	if (state === 'running') {
		// Elle répond, sans verdict encore : elle est en train de s'y connecter.
		return i18n.t(
			boxMode ? 'access:handover.box.joining' : 'access:handover.box.searching',
			{seconds: elapsed}
		);
	}

	if (state === 'done') return i18n.t('access:handover.box.connected');

	if (state === 'failed') {
		if (failure) return i18n.t('access:handover.box.failed');
		// Le mode qu'elle annonce vaut mieux qu'un « introuvable ».
		return boxMode
			? i18n.t('access:handover.box.mode', {mode: boxMode.mode})
			: i18n.t('access:handover.box.noResponse');
	}

	return i18n.t('access:handover.pending');
}

/** Où en est l'essai de connexion au serveur local. */
function serverDetail(state: StepState, elapsed: number): string {
	if (state === 'running') {
		return i18n.t('access:handover.server.testing', {seconds: elapsed});
	}
	if (state === 'done') return i18n.t('access:handover.server.reachable');
	if (state === 'failed') return i18n.t('access:handover.server.unreachable');
	return i18n.t('access:handover.pending');
}

/** Sur quel réseau le téléphone se trouve, quand il consent à le dire. */
function phoneDetail(state: StepState, phoneSsid: string | null): string {
	if (state === 'running') {
		return phoneSsid
			? i18n.t('access:handover.phone.currentlyOn', {ssid: phoneSsid})
			: i18n.t('access:handover.phone.reconnecting');
	}

	if (state === 'failed') {
		return phoneSsid
			? i18n.t('access:handover.phone.stayedOn', {ssid: phoneSsid})
			: i18n.t('access:handover.phone.unknownNetwork');
	}

	if (state === 'done') {
		return phoneSsid
			? i18n.t('access:handover.phone.connectedTo', {ssid: phoneSsid})
			: i18n.t('access:handover.phone.unverifiable');
	}

	return i18n.t('access:handover.pending');
}

/** Le texte qui explique où l'on en est, ou pourquoi on s'est arrêté là. */
function bodyFor(args: {
	phase: Phase;
	progress: Progress;
	boxMode: BoxMode | null;
	failure: Failure | null;
	network: string;
	deviceName: string;
}): string {
	const {phase, progress, boxMode, failure, network, deviceName} = args;

	switch (phase) {
		case 'confirmed': {
			const joined = boxMode?.configure?.ssid || boxMode?.ssid || network;
			return deviceName
				? i18n.t('access:handover.body.confirmedNamed', {
						name: deviceName,
						network: joined
				  })
				: i18n.t('access:handover.body.confirmed', {network: joined});
		}

		case 'failed': {
			if (!failure) return i18n.t('access:configureError.CONFIGURE_FAILED');
			const reason = i18n.t(`access:configureError.${failure.code}`);
			// Le Wi-Fi n'a pas abouti et le téléphone a déjà quitté le point
			// d'accès : la correction passe par le scanner.
			return !failure.onHotspot && locationAfter(failure) === 'hotspot'
				? `${reason} ${i18n.t('access:handover.body.failedHotspot')}`
				: reason;
		}

		case 'offNetwork':
			return i18n.t('access:handover.body.offNetwork', {network});

		case 'unconfirmed':
			// Jamais jointe, ou jointe sans verdict : le mode qu'elle annonce
			// évite d'avoir à deviner.
			return boxMode
				? i18n.t('access:handover.body.notJoined', {
						network,
						state: boxMode.mode
				  })
				: i18n.t('access:handover.body.noAnswer', {network});

		case 'serverUnreachable':
			return i18n.t('access:handover.body.serverUnreachable', {
				network,
				seconds: SERVER_TIMEOUT_MS / 1000
			});

		default:
			if (progress.send === 'running') {
				return i18n.t('access:handover.body.sending');
			}
			if (progress.server === 'running') {
				return i18n.t('access:handover.body.testingServer', {network});
			}
			return progress.phone === 'running'
				? i18n.t('access:handover.body.apReleased', {network})
				: i18n.t('access:handover.body.applying', {network});
	}
}

/** Deux noms de réseau désignent-ils le même ? */
function sameNetwork(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/* eslint-disable react-native/no-unused-styles */
const styles = {
	...accessStyles,
	...StyleSheet.create({
		spinner: {marginTop: 25},
		progress: {color: COLORS.primary, fontSize: 14, marginTop: 10},
		screen: {flex: 1},
		screenContent: {
			alignItems: 'center',
			paddingTop: 30,
			paddingBottom: 40,
			paddingHorizontal: 24
		},
		badge: {
			width: 64,
			height: 64,
			borderRadius: 32,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 6
		},
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
