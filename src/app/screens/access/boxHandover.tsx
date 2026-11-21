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
	faRotateRight
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
	accessStyles
} from './accessUi';

/**
 * Au-delà, la box n'a pas rendu de verdict sur la configuration : elle ne l'a
 * pas reçue, ou ne répond plus.
 */
const OUTCOME_TIMEOUT_MS = 90000;

/**
 * Temps laissé au serveur local de la box pour accepter une connexion. Elle
 * vient d'être configurée : il peut encore être en train de démarrer.
 */
const SERVER_TIMEOUT_MS = 40000;
const SERVER_PROBE_INTERVAL_MS = 2000;

type Phase =
	/** L'initialisation est en cours. */
	| 'waiting'
	/** La box déclare la configuration appliquée, et son serveur local répond. */
	| 'confirmed'
	/** La box a refusé la configuration, ou n'a pas pu l'appliquer. */
	| 'failed'
	/** Aucun verdict sur la configuration après OUTCOME_TIMEOUT_MS. */
	| 'unconfirmed'
	/** Box configurée, mais son serveur local n'a pas répondu à temps. */
	| 'serverUnreachable';

type StepState = 'pending' | 'running' | 'done' | 'failed';

/** Pourquoi la configuration a échoué. */
type Failure = {code: ConfigureErrorCode | 'NOT_RECEIVED'};

/**
 * Crée le profil de la box, maintenant qu'elle est confirmée sur le réseau.
 *
 * Seulement à ce moment-là : une configuration qui échoue ne doit laisser
 * aucun profil derrière elle. Sans l'attendre : le trousseau peut demander une
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

/**
 * Dernière étape de l'assistant : l'initialisation du serveur de la box.
 *
 * Quand on arrive ici, la box et le téléphone sont déjà sur le réseau
 * domestique — c'est la première étape du formulaire qui l'y a fait passer.
 * Si une configuration vient d'être envoyée (`setup`), son issue est d'abord
 * lue dans `getMode`, sans étape à l'écran : la box y publie le résultat de
 * `configure` — en cours, réussie, ou échouée avec son code. Puis son serveur
 * local est essayé, jusqu'à ce qu'il accepte une connexion.
 */
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
	const [failure, setFailure] = useState<Failure | null>(null);
	const [server, setServer] = useState<StepState>('running');

	const mounted = useRef(true);
	// Chaque vérification annule la précédente : « Réessayer » ne doit pas
	// laisser deux boucles écrire la même phase.
	const attempt = useRef(0);

	const {t} = useTranslation('access');
	const nav = useNavigation();

	/** Sortie normale : la pile d'appairage est morte, on la remplace. */
	const goToSignin = useCallback(() => {
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
	 * Retour au formulaire pour corriger. La box est sur le réseau domestique,
	 * où le formulaire la retrouve ; le brouillon rend la saisie, et `code` lui
	 * dit ce qui est à corriger.
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

	useEffect(() => {
		nav.setOptions({
			// Même en-tête que les étapes du formulaire, dont celle-ci est la
			// suite.
			headerLeft: brandLogo,
			// Quitter l'assistant : retour à la liste des profils. Aucun retour
			// en arrière — la configuration est partie.
			headerRight: () => navigationHeader(goToProfiles, 'arrow-alt-circle-right', false)
		});
	}, [goToProfiles, nav]);

	const verify = useCallback(async () => {
		attempt.current += 1;
		const current = attempt.current;
		const alive = () => mounted.current && attempt.current === current;

		setPhase('waiting');
		setElapsed(0);
		setServer('running');
		setFailure(null);
		setBoxMode(null);

		/** Fin de parcours : la phase, l'état de l'étape, et le retour haptique. */
		const settle = (outcome: Exclude<Phase, 'waiting'>, state: StepState) => {
			setServer(state);
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

		const fail = (reason: Failure) => {
			setFailure(reason);
			settle('failed', 'failed');
		};

		// La configuration, quand il y en a une : `recovery` n'envoie rien de
		// plus que le réseau, déjà rejoint.
		const sent: ConfigureSend | null = await settlePendingConfiguration();
		if (!alive()) return;
		if (sent?.kind === 'refused') return fail({code: sent.code});

		if (sent) {
			const outcome = await pollUntil<ConfigureOutcome>(
				async () => {
					const mode = await getBoxMode(deviceId);
					if (!mode || !alive()) return undefined;
					setBoxMode(mode);
					const read = configureOutcome(mode, staleStartedAt);
					if (read.kind === 'pending') return undefined;
					// Acceptée, elle ne peut pas ne pas l'avoir reçue : c'est une
					// lecture faite avant qu'elle ne publie son résultat.
					if (read.kind === 'notApplied' && sent.kind === 'accepted') {
						return undefined;
					}
					return read;
				},
				{timeoutMs: OUTCOME_TIMEOUT_MS, shouldContinue: alive}
			);
			if (!alive()) return;

			switch (outcome?.kind) {
				case 'succeeded':
					break;
				case 'failed':
					return fail({code: outcome.code});
				case 'notApplied':
					return fail({code: 'NOT_RECEIVED'});
				default:
					return settle('unconfirmed', 'failed');
			}
		}

		// Le serveur local : une connexion websocket est ouverte puis refermée
		// aussitôt, et retentée tant qu'elle échoue.
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

		return reachable
			? settle('confirmed', 'done')
			: settle('serverUnreachable', 'failed');
	}, [deviceId, staleStartedAt]);

	useEffect(() => {
		mounted.current = true;
		verify();

		return () => {
			mounted.current = false;
		};
	}, [verify]);

	// Une attente muette laisse croire à un blocage ; le compteur dit que
	// quelque chose se passe encore.
	useEffect(() => {
		if (phase !== 'waiting') return;
		const timer = setInterval(() => setElapsed(value => value + 1), 1000);
		return () => clearInterval(timer);
	}, [phase]);

	const network = ssid || t('handover.yourNetwork');
	const summary = SUMMARIES[phase];

	const fixInput = (
		<OutlineButton
			label={t('handover.fixInput')}
			icon={faPen}
			onPress={() => goToForm(failure?.code ?? 'NOT_RECEIVED')}
		/>
	);

	const retry = (
		<OutlineButton
			label={t('handover.retry')}
			icon={faRotateRight}
			onPress={verify}
		/>
	);

	/**
	 * Connexion : visible pendant l'initialisation, mais active seulement une
	 * fois le serveur joignable — avant, rien ne dit que la box répondra.
	 */
	const signInButton = (
		<OutlineButton
			label={t('handover.signIn')}
			icon={faRightToBracket}
			disabled={phase !== 'confirmed'}
			onPress={goToSignin}
		/>
	);

	const actions = () => {
		switch (phase) {
			case 'failed':
				return fixInput;
			case 'unconfirmed':
			case 'serverUnreachable':
				return (
					<>
						{retry}
						{fixInput}
					</>
				);
			default:
				return signInButton;
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
				{bodyFor({phase, boxMode, failure, network, deviceName})}
			</Text>

			<View style={styles.card}>
				<Step
					state={server}
					label={t(
						server === 'done'
							? 'handover.serverInitialized'
							: 'handover.serverInitializing'
					)}
					detail={serverDetail(server, failure, elapsed)}
				/>
			</View>

			{actions()}
		</ScrollView>
	);
}

/** Une ligne de la liste d'étapes : son état, son libellé, son détail. */
const Step = ({
	state,
	label,
	detail,
	warning
}: {
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
			<Text style={styles.stepLabel}>{label}</Text>
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

/** Où en est l'initialisation, ou ce qui l'a arrêtée. */
function serverDetail(
	state: StepState,
	failure: Failure | null,
	elapsed: number
): string {
	if (state === 'running') {
		return i18n.t('access:handover.server.testing', {seconds: elapsed});
	}
	if (state === 'done') return i18n.t('access:handover.server.reachable');
	if (failure) return i18n.t('access:handover.box.failed');
	return i18n.t('access:handover.server.unreachable');
}

/** Le texte qui explique où l'on en est, ou pourquoi on s'est arrêté là. */
function bodyFor(args: {
	phase: Phase;
	boxMode: BoxMode | null;
	failure: Failure | null;
	network: string;
	deviceName: string;
}): string {
	const {phase, boxMode, failure, network, deviceName} = args;

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

		case 'failed':
			return i18n.t(
				`access:configureError.${failure?.code ?? 'CONFIGURE_FAILED'}`
			);

		case 'unconfirmed':
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
			return i18n.t('access:handover.body.testingServer', {network});
	}
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
