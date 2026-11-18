import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React, {useCallback, useEffect, useRef} from 'react';
import {
	ActivityIndicator,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TextInputProps,
	TouchableOpacity,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import i18n from 'i18next';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useNavigation} from '@react-navigation/native';
import {
	faArrowRight,
	faCheck,
	faRotateRight,
	faWifi
} from '@fortawesome/free-solid-svg-icons';
import {
	InputStyle,
	placeholderColor,
	inputText
} from '../../styles/components/common/Input';
import {hapticOptions} from '../../data/cycleTypes';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {findProfileByLogin} from '../../components/common/RememberMeManager';
import {getBoxEndpoint, hotspotService} from '../../../services/hotspot';
import {
	BoxMode,
	ConfigureErrorCode,
	ConfigureSend,
	boxGet,
	boxPost,
	boxUrl,
	checkBoxPassword,
	configureSendResult,
	getBoxMode,
	isTransientMode,
	pollUntil,
	waitForStableMode
} from '../../../services/http';
import {
	PendingCoordinates,
	startLocalCoordinates
} from '../../../services/geolocation/GeolocationService';
import {
	BOX_CONFIGURATION_STEPS,
	BoxConfigurationErrors,
	BoxConfigurationForm,
	BoxConfigurationMode,
	BoxConfigurationStep,
	fieldsOfStep,
	isBoxConfigurationValid,
	PASSWORD_MIN_LENGTH,
	stepErrors,
	validateBoxConfiguration
} from '../../../services/validation';
import {
	clearPendingConfiguration,
	readBoxConfigurationDraft,
	saveBoxConfigurationDraft,
	setPendingConfiguration,
	setPendingProfile
} from './boxConfigurationDraft';
import {
	BusyOverlay,
	COLORS,
	Centered,
	DangerBox,
	DescBox,
	InfoBox,
	LinkButton,
	OutlineButton,
	StepProgress,
	WifiSettingsLink,
	accessStyles
} from './accessUi';
import {BoxHandover} from './boxHandover';
import {ErrorBox} from '../../components/common/ErrorBox';
import {AppSwitch} from '../../components/common/AppSwitch';
import {WarningBox, WARNING_COLORS} from '../../components/common/WarningBox';

/** Routes de la box appelées depuis cet écran. */
const NETWORKS_PATH = '/updater/getNetworksList';
const JOIN_PATH = '/updater/network/joinLocalNetwork';
const CONFIGURE_PATH = '/updater/configure';

/** Au-delà, une box injoignable ferait patienter indéfiniment. */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Temps laissé à la box pour quitter `starting` / `connecting`. Une tentative
 * de connexion Wi-Fi qui échoue peut prendre une bonne trentaine de secondes
 * avant qu'elle ne retombe en `recovery`.
 */
const MODE_TIMEOUT_MS = 60000;

/**
 * Budget accordé à `configure`, envoyée sans être attendue. C'est `getMode`,
 * que `BoxHandover` lit ensuite, qui dit ce que la configuration est devenue.
 */
const CONFIGURE_TIMEOUT_MS = 20000;

/**
 * Budget de `joinLocalNetwork`. La box peut quitter son point d'accès avant
 * d'avoir répondu : un appel resté sans réponse n'est pas un échec.
 */
const JOIN_TIMEOUT_MS = 15000;

/** Temps laissé au téléphone pour revenir sur le réseau demandé. */
const PHONE_JOIN_MS = 30000;
const PHONE_PROBE_INTERVAL_MS = 1500;

/**
 * Temps laissé à la box pour apparaître sur le réseau demandé. Une tentative
 * de connexion Wi-Fi peut prendre une bonne trentaine de secondes.
 */
const BOX_JOIN_MS = 90000;

/**
 * Ce que l'envoi accepte encore d'attendre pour la position, si elle n'est
 * pas déjà arrivée. Court : la box se configure très bien sans, alors que
 * retarder `configure` coûte cher — c'est du temps passé sur le point
 * d'accès sans rien émettre, et il peut tomber pendant ce temps-là.
 */
const COORDINATES_GRACE_MS = 2000;

type NetworkOption = {
	label: string;
	value: string;
	/** La box connaît déjà ce réseau, et sa clé. */
	isConfigured: boolean;
	/** La box y est connectée en ce moment : il n'y a rien à rejoindre. */
	isConnected: boolean;
};

/**
 * Pourquoi la box n'a pas pu être retrouvée sur le réseau demandé :
 * - `phone` : le téléphone est resté sur un autre réseau ;
 * - `box` : le téléphone y est, mais pas la box — clé fausse, le plus souvent,
 *   et elle a alors rouvert son point d'accès.
 */
type JoinIssue = 'phone' | 'box';

/**
 * Motif avec lequel `BoxHandover` renvoie ici : un refus de `configure`, ou
 * une configuration que la box n'a jamais reçue.
 */
type ReturnReason = ConfigureErrorCode | 'NOT_RECEIVED';

/**
 * Où en est l'écran avant que le formulaire ait un sens :
 * - `detecting` : on attend que la box quitte `starting` / `connecting` ;
 * - `unreachable` : aucun mode stable dans le budget imparti ;
 * - `normal` : la box est déjà configurée et n'accepte rien ici ;
 * - `ready` : `setup` ou `recovery`, le formulaire correspondant s'affiche.
 */
type Phase = 'detecting' | 'unreachable' | 'normal' | 'ready';

/**
 * Configuration de la box une fois le téléphone connecté à son hotspot.
 *
 * Le formulaire suit le mode que la box annonce (`getMode`) :
 * - `setup` : réseau, mot de passe de l'étiquette, puis nom et nouveau mot de
 *   passe ;
 * - `recovery` : le réseau seulement.
 *
 * La première étape fait rejoindre le réseau choisi à la box
 * (`joinLocalNetwork`), relâche son point d'accès, attend que le téléphone y
 * soit revenu puis que la box y réponde à `getMode`. Tout ce qui suit lui
 * parle sur ce réseau : le mot de passe de l'étiquette est vérifié aussitôt
 * saisi (`checkPassword`), et la dernière étape envoie `configure`. L'écran
 * d'état s'ouvre alors sans attendre de réponse : c'est `getMode` qui y dit
 * la suite, refus compris. En `recovery`, il s'ouvre dès le réseau rejoint.
 *
 * Tout passe en HTTPS sur le hotspot de la box.
 */
export function BoxConfiguration(props: any) {
	// `deviceId` du QR scanné : c'est sous lui que l'endpoint de la box est rangé.
	const deviceId: string | undefined = props.route?.params?.deviceId;
	// Mot de passe de l'étiquette lu dans le QR, s'il y figure.
	const devicePassword: string | undefined =
		props.route?.params?.devicePassword;
	// Repris du brouillon quand on revient ici après un échec de bascule :
	// refaire saisir six champs pour corriger une clé Wi-Fi serait une punition.
	// Fusionné aux valeurs par défaut : un brouillon d'une version antérieure du
	// formulaire n'a pas forcément tous les champs.
	const [form, setForm] = React.useState<BoxConfigurationForm>(() => ({
		deviceName: '',
		ssid: '',
		psk: '',
		boxIdentifier: '',
		email: '',
		currentPassword: '',
		password: '',
		confirmPassword: '',
		...readBoxConfigurationDraft()
	}));
	// Un champ jamais rempli ne doit pas être signalé en rouge d'entrée de jeu :
	// son erreur n'apparaît qu'une fois qu'il a été touché, ou à la soumission.
	const [touched, setTouched] = React.useState<
		Partial<Record<keyof BoxConfigurationForm, boolean>>
	>({});
	// Refus prononcés par la box elle-même — un mot de passe incorrect,
	// rapporté par `BoxHandover`. Ils s'affichent comme une erreur de champ,
	// jusqu'à ce que ce champ change.
	const [serverErrors, setServerErrors] =
		React.useState<BoxConfigurationErrors>({});
	const [phase, setPhase] = React.useState<Phase>('detecting');
	const [detectingMessage, setDetectingMessage] = React.useState('');
	const [boxMode, setBoxMode] = React.useState<BoxMode | null>(null);
	const [stepIndex, setStepIndex] = React.useState(0);
	const [networks, setNetworks] = React.useState<NetworkOption[]>([]);
	const [dropdownOpen, setDropdownOpen] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const [busyMessage, setBusyMessage] = React.useState('');
	const [error, setError] = React.useState('');
	// Pourquoi la tentative précédente a échoué, tel que la box le rapporte.
	// Affiché jusqu'à la première correction.
	const [lastFailure, setLastFailure] = React.useState('');
	// La box a rejoint le réseau choisi : l'étape Wi-Fi n'est plus à valider
	// avant d'envoyer `configure`.
	const [joined, setJoined] = React.useState(false);
	const [joinIssue, setJoinIssue] = React.useState<JoinIssue | null>(null);
	// Première connexion de la box : elle n'a encore jamais rejoint de réseau,
	// son mot de passe est donc celui de l'étiquette. Arrêté en quittant
	// l'étape Wi-Fi — la box n'a encore rien rejoint de son fait.
	const [firstConnection, setFirstConnection] = React.useState(true);
	// La box garde son mot de passe actuel au lieu d'en recevoir un nouveau —
	// par défaut : en changer est un choix explicite.
	const [keepPassword, setKeepPassword] = React.useState(true);
	// Configuration envoyée : la dernière étape, la progression, prend la
	// place du formulaire. Porte ce dont `BoxHandover` a besoin.
	const [handover, setHandover] = React.useState<Record<
		string,
		unknown
	> | null>(null);
	// Profil déjà enregistré pour cette box. En `recovery`, il garde son nom et
	// son mot de passe, que la reconnexion ne change pas ; en `setup`, il
	// interdit d'en créer un second pour le même identifiant.
	const [savedProfile, setSavedProfile] = React.useState<string>();

	const set = <K extends keyof BoxConfigurationForm>(
		field: K,
		value: BoxConfigurationForm[K]
	) => {
		setForm(previous => ({...previous, [field]: value}));
		setTouched(previous => ({...previous, [field]: true}));
		setLastFailure('');
		setJoinIssue(null);
		setServerErrors(previous => {
			if (!previous[field]) return previous;
			const next = {...previous};
			delete next[field];
			return next;
		});
	};

	const {t} = useTranslation(['access', 'common']);
	const nav = useNavigation();

	const mode: BoxConfigurationMode =
		boxMode?.mode === 'recovery' ? 'recovery' : 'setup';
	const steps = BOX_CONFIGURATION_STEPS[mode];
	const step: BoxConfigurationStep =
		steps[Math.min(stepIndex, steps.length - 1)];
	const isLastStep = stepIndex >= steps.length - 1;

	// La détection interroge la box en boucle : elle doit s'arrêter avec l'écran.
	const mountedRef = useRef(true);
	// Réseau choisi à la main dans la liste : il passe devant la présélection.
	const ssidPickedRef = useRef(false);
	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		nav.setOptions({
			headerRight: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				),
			headerLeft: brandLogo
		});
	}, [nav, props.navigation]);

	// Retour arrière — bouton, geste ou touche matérielle — au milieu de
	// l'assistant : on recule d'une étape, plutôt que de quitter. Le `reset` qui suit la soumission, lui,
	// n'est pas un retour et passe.
	const stepIndexRef = useRef(stepIndex);
	stepIndexRef.current = stepIndex;
	const handoverRef = useRef(handover);
	handoverRef.current = handover;
	useEffect(
		() =>
			props.navigation.addListener('beforeRemove', (e: any) => {
				const type = e.data?.action?.type;
				if (type !== 'GO_BACK' && type !== 'POP') return;
				if (handoverRef.current) {
					// Configuration envoyée : on ne revient plus au formulaire.
					e.preventDefault();
				} else if (stepIndexRef.current > 0) {
					e.preventDefault();
					setStepIndex(index => index - 1);
					setDropdownOpen(false);
					setError('');
				}
			}),
		[props.navigation]
	);

	/** Réseaux Wi-Fi vus par la box, à rejoindre une fois configurée. */
	const loadNetworks = useCallback(async () => {
		setIsLoading(true);
		setBusyMessage(t('boxConfig.searchingNetworks'));
		setError('');
		try {
			const url = await boxUrl(NETWORKS_PATH, deviceId);
			const {status, body} = await boxGet(url, REQUEST_TIMEOUT_MS);
			if (status < 200 || status >= 300) {
				throw new Error(`HTTP ${status}`);
			}
			const found = parseNetworks(body);
			setNetworks(found);
			// Présélection : le réseau où la box est, à défaut celui qu'elle
			// connaît, sinon aucun. Seul un choix fait à la main, toujours dans
			// la liste, la remplace.
			const preferred =
				found.find(n => n.isConnected) ??
				found.find(n => n.isConfigured);
			setForm(previous =>
				ssidPickedRef.current &&
				found.some(n => n.value === previous.ssid)
					? previous
					: {...previous, ssid: preferred?.value ?? ''}
			);
		} catch (e) {
			console.warn('[BoxConfiguration] getNetworksList:', e);
			const err = e instanceof Error ? e : new Error(String(e));
			setError(
				err.name === 'AbortError'
					? t('boxConfig.noResponse')
					: t('boxConfig.networksUnavailable', {error: err.message})
			);
		} finally {
			setIsLoading(false);
		}
	}, [t, deviceId]);

	// Position demandée dès que le mode `setup` est connu plutôt qu'au moment
	// d'envoyer : voir `startLocalCoordinates`. Ici le retard se paierait
	// doublement, puisqu'il s'écoulerait sur le point d'accès de la box sans que
	// rien ne soit émis. Inutile en `recovery`, qui ne l'envoie pas.
	const coordinatesRef = React.useRef<PendingCoordinates | undefined>(
		undefined
	);

	/**
	 * Attend un mode où la box accepte une configuration, puis prépare le
	 * formulaire qui lui correspond.
	 */
	const detect = useCallback(async () => {
		setPhase('detecting');
		setDetectingMessage(t('boxConfig.detecting'));
		const found = await waitForStableMode({
			deviceId,
			timeoutMs: MODE_TIMEOUT_MS,
			shouldContinue: () => mountedRef.current,
			onProgress: current =>
				setDetectingMessage(
					t(
						current.mode === 'starting'
							? 'boxConfig.modeStarting'
							: current.mode === 'connecting'
							? 'boxConfig.modeConnecting'
							: 'boxConfig.detecting'
					)
				)
		});
		if (!mountedRef.current) return;
		if (!found) return setPhase('unreachable');
		if (found.mode === 'normal') return setPhase('normal');

		setBoxMode(found);
		setStepIndex(0);
		if (found.mode === 'setup') {
			if (!coordinatesRef.current) {
				coordinatesRef.current = startLocalCoordinates();
			}
		}
		setPhase('ready');
	}, [deviceId, t]);

	useEffect(() => {
		detect();
	}, [detect]);

	useEffect(() => {
		if (phase === 'ready') loadNetworks();
	}, [phase, loadNetworks]);

	// L'identifiant de la box est le `deviceId` du QR scanné, sans `.local` : il
	// vient du QR et n'a pas à être ressaisi. Toujours relu, même par-dessus
	// un brouillon, qui pourrait venir d'une autre box.
	useEffect(() => {
		let cancelled = false;
		getBoxEndpoint(deviceId).then(endpoint => {
			// Un endpoint enregistré avant l'ajout de `deviceId` n'en a pas.
			if (cancelled || !endpoint?.deviceId) return;
			const boxIdentifier = endpoint.deviceId.replace(/\.local$/i, '');
			setForm(previous => ({...previous, boxIdentifier}));
		});
		return () => {
			cancelled = true;
		};
	}, [deviceId]);

	// Ce qui a fait échouer la tentative précédente, dit une fois le formulaire
	// prêt : le motif rapporté par `BoxHandover` s'il renvoie ici, sinon le
	// dernier échec que la box publie — celui qu'on vient corriger après avoir
	// rescanné son QR code.
	const returnReason: ReturnReason | undefined =
		props.route?.params?.configureError;
	const reportedFor = useRef<BoxMode | null>(null);
	useEffect(() => {
		if (phase !== 'ready' || !boxMode || reportedFor.current === boxMode) {
			return;
		}
		reportedFor.current = boxMode;

		if (returnReason === 'INVALID_CURRENT_PASSWORD') {
			// Retour là où il se saisit, vidé : le garder ferait renvoyer le
			// même.
			setForm(previous => ({...previous, currentPassword: ''}));
			setServerErrors(previous => ({
				...previous,
				currentPassword: 'currentPasswordWrong'
			}));
			setStepIndex(
				Math.max(0, BOX_CONFIGURATION_STEPS[mode].indexOf('ownership'))
			);
		} else if (returnReason) {
			setLastFailure(t(`configureError.${returnReason}`));
		} else if (
			boxMode.configure?.status === 'failed' &&
			boxMode.configure.errorCode &&
			// Le bandeau de `recovery` le dit déjà.
			!recoveryBanner(boxMode)
		) {
			setLastFailure(t(`configureError.${boxMode.configure.errorCode}`));
		}
		if (returnReason)
			props.navigation.setParams({configureError: undefined});
	}, [phase, boxMode, mode, returnReason, t, props.navigation]);

	// Lu sans le trousseau : seul le nom du profil est utile ici.
	useEffect(() => {
		if (phase !== 'ready' || !form.boxIdentifier) return;
		let cancelled = false;
		findProfileByLogin(form.boxIdentifier).then(profile => {
			if (!cancelled) setSavedProfile(profile);
		});
		return () => {
			cancelled = true;
		};
	}, [phase, form.boxIdentifier]);

	// Un profil porte déjà cet identifiant : installer la box en créerait un
	// second, que la connexion ne saurait pas départager.
	const duplicateProfile = mode === 'setup' ? savedProfile : undefined;
	const duplicateMessage = duplicateProfile
		? t('boxConfig.duplicateProfile', {profile: duplicateProfile})
		: '';

	// Le point d'accès peut aussi tomber avant toute soumission — box
	// redémarrée, hors de portée. Relâcher la demande réseau évite alors
	// qu'Android reste à guetter ce SSID au lieu de rendre la main au Wi-Fi
	// enregistré. Après soumission, c'est `BoxHandover` qui en est chargé.
	useEffect(
		() => hotspotService.onLost(() => hotspotService.disconnect()),
		[]
	);

	// Réseau déjà connu de la box : elle en a la clé.
	const selectedNetwork = networks.find(n => n.value === form.ssid);
	// Connectée à ce réseau, la box n'a pas à le rejoindre : l'étape Wi-Fi
	// passe directement à la suite.
	const alreadyConnected = Boolean(selectedNetwork?.isConnected);
	const pskOptional = Boolean(
		selectedNetwork?.isConfigured || selectedNetwork?.isConnected
	);
	const errors: BoxConfigurationErrors = {
		...validateBoxConfiguration(form, mode, {
			pskOptional,
			keepCurrentPassword: keepPassword
		}),
		...serverErrors
	};
	const isStepValid = isBoxConfigurationValid(stepErrors(errors, step));

	/**
	 * Message à afficher sous un champ : rien tant qu'il n'a pas été touché —
	 * sauf l'identifiant, en lecture seule, qui ne le sera jamais, et les refus
	 * de la box, qui suivent toujours une saisie.
	 */
	const errorFor = (field: keyof BoxConfigurationForm) => {
		const shown =
			touched[field] || field === 'boxIdentifier' || serverErrors[field];
		const issue = shown ? errors[field] : undefined;
		return issue
			? t(`validation.${issue}`, {min: PASSWORD_MIN_LENGTH})
			: undefined;
	};

	/**
	 * Sous le mot de passe actuel : le refus de la box dans un encadré
	 * d'erreur, ou à défaut l'erreur de saisie (champ vide).
	 */
	const currentPasswordFeedback = () =>
		serverErrors.currentPassword === 'currentPasswordWrong' ? (
			<ErrorBox
				message={t(
					firstConnection
						? 'boxConfig.labelPasswordWrong'
						: 'boxConfig.boxPasswordWrong'
				)}
				style={styles.fieldBox}
			/>
		) : (
			<FieldError message={errorFor('currentPassword')} />
		);

	const touchAll = (fields: (keyof BoxConfigurationForm)[]) =>
		setTouched(previous => {
			const next = {...previous};
			for (const field of fields) next[field] = true;
			return next;
		});

	// Un seul envoi : rien ne grise le bouton ni la touche « Terminé » du
	// clavier entre l'appui et l'ouverture de l'écran d'état. Sans ce verrou, un
	// second appui renverrait `configure`.
	const sentRef = useRef(false);

	const next = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		Keyboard.dismiss();

		// Le bouton reste pressable même grisé : c'est ici qu'une étape
		// invalide montre enfin ce qui bloque, y compris sur les champs jamais
		// touchés.
		if (!isStepValid) {
			touchAll(fieldsOfStep(step));
			return;
		}

		// Dit à chaque étape, et pas seulement à la première : un bouton qui ne
		// fait que vibrer passerait pour un écran figé.
		if (duplicateProfile) {
			ReactNativeHapticFeedback.trigger(
				'notificationError',
				hapticOptions
			);
			setError(duplicateMessage);
			return;
		}

		setError('');
		setDropdownOpen(false);

		if (step === 'wifi') {
			return alreadyConnected
				? afterJoin()
				: joinNetwork(form.ssid, pskOptional ? '' : form.psk);
		}
		if (step === 'ownership') return verifyOwnership();
		if (!isLastStep) {
			setStepIndex(index => index + 1);
			return;
		}

		// Garde-fou : un brouillon repris peut avoir laissé une étape précédente
		// invalide. On y retourne plutôt que d'envoyer — y compris pour le
		// nouveau mot de passe, qui ne se compare à celui de l'étiquette qu'une
		// fois ce dernier saisi.
		// L'étape Wi-Fi n'est plus à refaire une fois la box sur le réseau.
		const firstInvalid = steps.findIndex(
			s =>
				!(s === 'wifi' && joined) &&
				!isBoxConfigurationValid(stepErrors(errors, s))
		);
		if (firstInvalid >= 0) {
			touchAll(fieldsOfStep(steps[firstInvalid]));
			setStepIndex(firstInvalid);
			return;
		}

		configure();
	};

	/** Busy overlay le temps d'une action ; rend vrai si l'écran est encore là. */
	const busy = (message: string) => {
		setBusyMessage(message);
		return mountedRef.current;
	};

	/**
	 * Étape 1 — la box rejoint le réseau choisi, et le téléphone avec elle.
	 *
	 * `joinLocalNetwork` part sur le point d'accès ; puis celui-ci est relâché,
	 * pour que le téléphone retombe sur le réseau enregistré, et la box y est
	 * cherchée avec `getMode`. Rejouable tel quel : relancée après un échec, la
	 * requête n'a plus de point d'accès où partir, et l'attente reprend.
	 */
	const joinNetwork = async (ssid: string, psk: string) => {
		const network = ssid;
		setIsLoading(true);
		setJoinIssue(null);
		try {
			busy(t('boxConfig.joinSending', {network}));
			try {
				const url = await boxUrl(JOIN_PATH, deviceId);
				const {status, body} = await boxPost(
					url,
					{ssid, ...(psk ? {psk} : {})},
					JOIN_TIMEOUT_MS
				);
				if (status >= 400) {
					console.warn(
						`[BoxConfiguration] joinLocalNetwork refusée — HTTP ${status} ${body.slice(
							0,
							200
						)}`
					);
					ReactNativeHapticFeedback.trigger(
						'notificationError',
						hapticOptions
					);
					setError(t('boxConfig.joinRefused', {status}));
					return;
				}
			} catch (e) {
				// Le plus souvent, la box a quitté son point d'accès avant de
				// répondre : c'est le réseau qui dira si elle l'a rejoint.
				console.warn(
					'[BoxConfiguration] joinLocalNetwork (bascule ?):',
					e
				);
			}

			// Le téléphone. Tant que le process reste rattaché au point
			// d'accès, toute sonde partirait sur une interface morte.
			if (!busy(t('boxConfig.joinPhone', {network}))) return;
			await hotspotService.disconnect().catch(() => undefined);
			const phone = await waitForPhoneOn(
				network,
				() => mountedRef.current
			);
			if (!mountedRef.current) return;
			if (phone.kind === 'elsewhere') {
				ReactNativeHapticFeedback.trigger(
					'notificationError',
					hapticOptions
				);
				setJoinIssue('phone');
				setError(
					t('boxConfig.phoneElsewhere', {ssid: phone.ssid, network})
				);
				return;
			}

			// La box. Toute réponse vient désormais du réseau domestique : elle
			// y est, il reste à attendre qu'elle ait fini de s'y connecter.
			if (!busy(t('boxConfig.joinBox', {network}))) return;
			const found = await pollUntil(
				async () => {
					const current = await getBoxMode(deviceId);
					if (!current || isTransientMode(current.mode))
						return undefined;
					if (current.ssid && !sameNetwork(current.ssid, network)) {
						return undefined;
					}
					return current;
				},
				{
					timeoutMs: BOX_JOIN_MS,
					shouldContinue: () => mountedRef.current
				}
			);
			if (!mountedRef.current) return;
			if (!found) {
				ReactNativeHapticFeedback.trigger(
					'notificationError',
					hapticOptions
				);
				setJoinIssue('box');
				setError(t('boxConfig.boxNotOnNetwork', {network}));
				return;
			}

			ReactNativeHapticFeedback.trigger(
				'notificationSuccess',
				hapticOptions
			);
			setJoined(true);
			// Revenu à cette étape, l'utilisateur la retrouve telle que la box
			// la verrait : connectée à ce réseau, plus rien à rejoindre.
			setNetworks(previous =>
				previous.map(n => ({...n, isConnected: n.value === network}))
			);
			afterJoin();
		} finally {
			if (mountedRef.current) setIsLoading(false);
		}
	};

	/** La box est sur le réseau choisi : la suite de l'assistant. */
	const afterJoin = () => {
		// Un réseau déjà configuré ou rejoint : la box a déjà servi, et son
		// mot de passe n'est plus forcément celui de l'étiquette.
		const first = !networks.some(n => n.isConfigured || n.isConnected);
		setFirstConnection(first);
		// Le mot de passe de la box est dans le QR : proposé dans tous les cas,
		// il reste à corriger si l'utilisateur l'a changé depuis. Une saisie
		// reprise du brouillon passe devant.
		if (devicePassword) {
			setForm(previous => ({
				...previous,
				currentPassword: previous.currentPassword || devicePassword
			}));
		}
		saveBoxConfigurationDraft(form);
		if (mode === 'recovery') {
			// La box garde son compte : il n'y a rien d'autre à lui envoyer.
			clearPendingConfiguration();
			setPendingProfile(null);
			openHandover(savedProfile ?? form.boxIdentifier.trim());
		} else {
			setStepIndex(index => index + 1);
		}
	};

	/**
	 * Étape 2 (`setup`) — le mot de passe de l'étiquette, vérifié par la box
	 * avant de passer au compte.
	 */
	const verifyOwnership = async () => {
		setIsLoading(true);
		busy(t('boxConfig.checkingPassword'));
		try {
			const verdict = await checkBoxPassword(
				deviceId,
				form.boxIdentifier.trim(),
				form.currentPassword
			);
			if (!mountedRef.current) return;
			switch (verdict.kind) {
				case 'valid':
					setStepIndex(index => index + 1);
					return;
				case 'invalid':
					ReactNativeHapticFeedback.trigger(
						'notificationError',
						hapticOptions
					);
					setServerErrors(previous => ({
						...previous,
						currentPassword: 'currentPasswordWrong'
					}));
					return;
				case 'locked':
					setError(t('boxConfig.passwordLocked'));
					return;
				default:
					setError(t('boxConfig.passwordCheckFailed'));
			}
		} finally {
			if (mountedRef.current) setIsLoading(false);
		}
	};

	/**
	 * Requête `configure`, de bout en bout : la position, attendue un court
	 * instant si elle n'est pas encore là, puis l'envoi. Lancée sans être
	 * attendue ; son issue est lue par `BoxHandover`.
	 */
	const sendConfiguration = async (
		payload: Record<string, unknown>
	): Promise<ConfigureSend> => {
		try {
			// Best effort pour la position : la box est configurée même sans
			// GPS, le champ est alors simplement omis. La box en déduit
			// elle-même son fuseau horaire.
			const localCoordinates =
				mode === 'setup'
					? await coordinatesRef.current?.take(COORDINATES_GRACE_MS)
					: undefined;
			const url = await boxUrl(CONFIGURE_PATH, deviceId);
			const {status, body} = await boxPost(
				url,
				{
					...payload,
					...(localCoordinates ? {localCoordinates} : {})
				},
				CONFIGURE_TIMEOUT_MS
			);
			const result = configureSendResult(status, body);
			if (result.kind !== 'accepted') {
				console.warn(
					`[BoxConfiguration] configure refusée — HTTP ${status} ${body.slice(
						0,
						200
					)}`
				);
			}
			return result;
		} catch (e) {
			console.warn('[BoxConfiguration] configure (bascule ?):', e);
			return {kind: 'lost'};
		}
	};

	/** Dernière étape (`setup`) : le compte part dans `configure`. */
	const configure = () => {
		if (sentRef.current) return;
		sentRef.current = true;

		// C'est l'identifiant de la box, et non l'email, qui sert de login.
		const login = form.boxIdentifier.trim();
		const deviceName = form.deviceName.trim();
		const email = form.email.trim();
		const newPassword = keepPassword ? form.currentPassword : form.password;

		// Retenu avant l'envoi : à partir d'ici le formulaire cède la place à
		// la progression, et c'est le brouillon qui rendra la saisie si la
		// configuration échoue.
		saveBoxConfigurationDraft(form);

		setPendingConfiguration(
			sendConfiguration({
				deviceName,
				ssid: form.ssid,
				// Clé saisie pour un autre réseau avant d'en choisir un connu :
				// elle n'a pas à partir.
				...(pskOptional ? {} : {psk: form.psk}),
				login,
				...(email ? {email} : {}),
				currentPassword: form.currentPassword,
				password: newPassword
			})
		);

		// Le nom de la box sert aussi de nom de profil. Il n'est pas créé ici
		// mais par `BoxHandover`, une fois la box confirmée : une configuration
		// qui échoue ne laisse ainsi aucun profil derrière elle.
		setPendingProfile({deviceName, login, password: newPassword});

		openHandover(deviceName);
	};

	/**
	 * La progression s'affiche ici même, comme dernière étape de l'assistant.
	 * Plus de retour possible vers le formulaire : toutes les sorties de
	 * `BoxHandover` remplacent la pile.
	 */
	const openHandover = (deviceName: string) => {
		Keyboard.dismiss();
		setHandover({
			deviceName,
			ssid: form.ssid,
			login: form.boxIdentifier.trim(),
			deviceId,
			// Résultat déjà publié avant cet envoi : il ne doit pas passer pour
			// le sien.
			staleStartedAt: boxMode?.configure?.startedAt ?? null,
			stepTotal: steps.length + 1
		});
	};

	if (handover) {
		return (
			<BoxHandover
				navigation={props.navigation}
				route={{params: handover}}
			/>
		);
	}

	if (phase === 'detecting') {
		return (
			<Centered>
				<ActivityIndicator size="large" color={COLORS.primary} />
				<Text style={accessStyles.title}>{detectingMessage}</Text>
				<Text style={accessStyles.body}>
					{t('boxConfig.detectingHint')}
				</Text>
			</Centered>
		);
	}

	if (phase === 'unreachable' || phase === 'normal') {
		const unreachable = phase === 'unreachable';
		return (
			<Centered>
				<Icon
					name={unreachable ? 'exclamation-triangle' : 'check-circle'}
					size={40}
					color={unreachable ? COLORS.danger : COLORS.success}
				/>
				<Text style={accessStyles.title}>
					{t(
						unreachable
							? 'boxConfig.unreachableTitle'
							: 'boxConfig.alreadyConfiguredTitle'
					)}
				</Text>
				<Text style={accessStyles.body}>
					{t(
						unreachable
							? 'boxConfig.unreachableBody'
							: 'boxConfig.alreadyConfiguredBody'
					)}
				</Text>
				{unreachable ? (
					<OutlineButton
						label={t('common:retry')}
						icon={faRotateRight}
						onPress={detect}
					/>
				) : null}
				<LinkButton
					label={t('common:back')}
					onPress={() => props.navigation.goBack()}
				/>
			</Centered>
		);
	}

	const selectedLabel =
		selectedNetwork?.label || form.ssid || t('boxConfig.wifiNetwork');

	const renderWifi = () => (
		<>
			{duplicateMessage ? (
				<WarningBox style={styles.duplicateBox}>
					<Text style={styles.reminderText}>{duplicateMessage}</Text>
				</WarningBox>
			) : null}
			<FieldLabel text={t('boxConfig.wifiNetwork')} />
			<View style={{width: '100%'}}>
				<TouchableOpacity
					style={[
						styles.input,
						{justifyContent: 'center'},
						errorFor('ssid') ? styles.fieldInvalid : null
					]}
					onPress={() => {
						setTouched(p => ({...p, ssid: true}));
						Keyboard.dismiss();
						setDropdownOpen(!dropdownOpen);
					}}>
					<View style={styles.dropdownHeader}>
						<View style={styles.networkName}>
							<Text
								style={[
									inputText,
									styles.networkLabel,
									!form.ssid && {color: placeholderColor}
								]}
								numberOfLines={1}>
								{selectedLabel}
							</Text>
							{selectedNetwork ? (
								<NetworkTag network={selectedNetwork} />
							) : null}
						</View>
						<Icon
							name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
							size={14}
							color={COLORS.primary}
						/>
					</View>
				</TouchableOpacity>
				{dropdownOpen && (
					<View style={styles.dropdown}>
						{networks.length === 0 ? (
							<TouchableOpacity
								style={styles.dropdownItem}
								onPress={() => {
									setDropdownOpen(false);
									loadNetworks();
								}}>
								<Text
									style={{
										fontSize: 18,
										color: placeholderColor
									}}>
									{t('boxConfig.noNetwork')}
								</Text>
							</TouchableOpacity>
						) : (
							<FlatList
								data={networks}
								keyExtractor={(_item, index) =>
									'network_' + index
								}
								renderItem={({item}: {item: NetworkOption}) => (
									<TouchableOpacity
										style={[
											styles.dropdownItem,
											item.value === form.ssid && {
												backgroundColor: '#EDF2F7'
											}
										]}
										onPress={() => {
											ssidPickedRef.current = true;
											set('ssid', item.value);
											setDropdownOpen(false);
										}}>
										<View style={styles.networkName}>
											<Text
												style={[
													{fontSize: 18},
													styles.networkLabel
												]}
												numberOfLines={1}>
												{item.label}
											</Text>
											<NetworkTag network={item} />
										</View>
									</TouchableOpacity>
								)}
							/>
						)}
					</View>
				)}
			</View>
			<FieldError message={errorFor('ssid')} />
			{networks.length > 0 ? (
				<TouchableOpacity
					style={styles.inlineLink}
					onPress={loadNetworks}>
					<Icon name="sync-alt" size={12} color={COLORS.accent} />
					<Text style={styles.inlineLinkText}>
						{t('boxConfig.refreshNetworks')}
					</Text>
				</TouchableOpacity>
			) : null}

			{/* Réseau déjà connu de la box : elle en a la clé. */}
			{pskOptional ? null : (
				<>
					<FieldLabel text={t('boxConfig.psk')} />
					<PasswordField
						invalid={Boolean(errorFor('psk'))}
						placeholder={t('boxConfig.psk')}
						textContentType="password"
						value={form.psk}
						onChangeText={value => set('psk', value)}
					/>
					<FieldError message={errorFor('psk')} />
				</>
			)}
			{/* Sans champ à l'écran : l'identifiant vient du QR code. */}
			<FieldError message={errorFor('boxIdentifier')} />
		</>
	);

	const renderAccount = () => (
		<>
			<FieldLabel text={t('boxConfig.deviceName')} />
			<TextInput
				style={[
					styles.field,
					errorFor('deviceName') ? styles.fieldInvalid : null
				]}
				placeholder={t('boxConfig.deviceNamePlaceholder')}
				placeholderTextColor={placeholderColor}
				autoCapitalize="none"
				autoCorrect={false}
				value={form.deviceName}
				onChangeText={value => set('deviceName', value)}
			/>
			<FieldError message={errorFor('deviceName')} />

			<FieldLabel
				text={t('boxConfig.email')}
				optional={t('boxConfig.optional')}
			/>
			<TextInput
				style={[
					styles.field,
					errorFor('email') ? styles.fieldInvalid : null
				]}
				placeholder={t('boxConfig.email')}
				placeholderTextColor={placeholderColor}
				keyboardType="email-address"
				textContentType={'emailAddress'}
				autoCapitalize="none"
				autoCorrect={false}
				value={form.email}
				onChangeText={value => set('email', value)}
			/>
			<FieldError message={errorFor('email')} />
			<Text style={styles.hint}>{t('boxConfig.emailRecoveryHint')}</Text>

			<View style={styles.toggleRow}>
				<Text style={[InputStyle.textInput, styles.toggleLabel]}>
					{t('boxConfig.keepPassword')}
				</Text>
				<AppSwitch
					value={keepPassword}
					onValueChange={value => {
						setKeepPassword(value);
						setLastFailure('');
					}}
					accessibilityLabel={t('boxConfig.keepPassword')}
				/>
			</View>
			{keepPassword ? (
				<Text style={styles.hint}>
					{t(
						firstConnection
							? 'boxConfig.keepLabelPasswordHint'
							: 'boxConfig.keepPasswordHint'
					)}
				</Text>
			) : (
				<>
					<FieldLabel text={t('boxConfig.newPassword')} />
					<PasswordField
						invalid={Boolean(errorFor('password'))}
						placeholder={t('boxConfig.newPassword')}
						textContentType="newPassword"
						value={form.password}
						onChangeText={value => set('password', value)}
					/>
					{errorFor('password') ? (
						<FieldError message={errorFor('password')} />
					) : (
						<Text style={styles.hint}>
							{t('boxConfig.passwordRules', {
								min: PASSWORD_MIN_LENGTH
							})}
						</Text>
					)}

					<FieldLabel text={t('boxConfig.confirmPassword')} />
					<PasswordField
						invalid={Boolean(errorFor('confirmPassword'))}
						placeholder={t('boxConfig.confirmPassword')}
						textContentType="newPassword"
						value={form.confirmPassword}
						onChangeText={value => set('confirmPassword', value)}
						onSubmitEditing={next}
						returnKeyType="done"
					/>
					<FieldError message={errorFor('confirmPassword')} />
				</>
			)}

			<DescBox style={styles.summary}>
				<Text style={accessStyles.cardLabel}>
					{t('boxConfig.boxIdentifier')}
				</Text>
				<Text style={styles.summaryValue}>{form.boxIdentifier}</Text>
				<Text style={accessStyles.cardLabel}>
					{t('boxConfig.wifiNetwork')}
				</Text>
				<Text style={styles.summaryValue}>{form.ssid}</Text>
			</DescBox>
			<WarningBox hideIcon={true} style={styles.reminderBox}>
				<Text style={styles.reminderText}>
					{t('boxConfig.boxIdentifierReminder')}
				</Text>
			</WarningBox>
		</>
	);

	/**
	 * Le mot de passe de l'étiquette : sa validation le fait vérifier par la
	 * box (`checkPassword`) avant de passer au compte.
	 */
	const ownershipLabel = t(
		firstConnection ? 'boxConfig.labelPassword' : 'boxConfig.boxPassword'
	);
	const renderOwnership = () => (
		<>
			<FieldLabel text={ownershipLabel} />
			<PasswordField
				autoFocus={true}
				invalid={Boolean(errorFor('currentPassword'))}
				placeholder={ownershipLabel}
				textContentType="password"
				value={form.currentPassword}
				onChangeText={value => set('currentPassword', value)}
				onSubmitEditing={next}
				returnKeyType="done"
			/>
			{currentPasswordFeedback()}
			<DescBox style={styles.passwordDesc}>
				<View style={styles.descRow}>
					<Icon
						name={firstConnection ? 'tag' : 'lock'}
						size={14}
						color={COLORS.primary}
					/>
					<Text style={styles.descText}>
						{t(
							firstConnection
								? 'boxConfig.labelPasswordHint'
								: 'boxConfig.boxPasswordHint'
						)}
					</Text>
				</View>
			</DescBox>
		</>
	);

	const renderStep = () => {
		switch (step) {
			case 'wifi':
				return renderWifi();
			case 'account':
				return renderAccount();
			case 'ownership':
				return renderOwnership();
		}
	};

	// En `recovery`, l'encadré et le bandeau parlent du Wi-Fi : ils restent
	// sur son étape.
	const recoveryWifi = mode === 'recovery' && step === 'wifi';

	return (
		<KeyboardAvoidingView
			style={{flex: 1}}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView
				style={{flex: 1}}
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag">
				{/* Un appui hors des champs et des boutons ferme le clavier. */}
				<Pressable
					style={styles.dismissArea}
					onPress={Keyboard.dismiss}
					accessible={false}>
					<StepHeader
						headerKey={mode === 'setup' ? step : 'recovery'}
						icon={stepIcon(step, firstConnection)}
						subtitle={
							mode !== 'setup'
								? undefined
								: step === 'ownership' && !firstConnection
								? t('boxConfig.ownershipSubtitleExisting')
								: t(`boxConfig.${step}Subtitle`)
						}
						info={
							recoveryWifi
								? t('boxConfig.existingAccount')
								: undefined
						}
						index={stepIndex}
						// L'écran de bascule est la dernière étape de l'assistant.
						total={steps.length + 1}
						banner={
							recoveryWifi ? recoveryBanner(boxMode) : undefined
						}
					/>

					<View style={styles.card}>
						<View style={{gap: 8, alignItems: 'center'}}>
							<DangerBox message={lastFailure} />

							{renderStep()}

							{error && error === duplicateMessage ? (
								<WarningBox style={styles.duplicateBox}>
									<Text style={styles.reminderText}>{error}</Text>
								</WarningBox>
							) : (
								<DangerBox message={error} />
							)}
							{joinIssue === 'phone' ? (
								<WifiSettingsLink />
							) : null}
							{joinIssue === 'box' ? (
								<LinkButton
									label={t('boxConfig.rescan')}
									onPress={() =>
										props.navigation.reset({
											index: 1,
											routes: [
												{name: 'Profiles'},
												{name: 'ScanBox'}
											]
										})
									}
								/>
							) : null}

							<OutlineButton
								label={t(
									step === 'wifi' && !alreadyConnected
										? 'boxConfig.joinNetwork'
										: !isLastStep
										? 'boxConfig.continue'
										: 'boxConfig.configure'
								)}
								icon={
									step === 'wifi' && !alreadyConnected
										? faWifi
										: !isLastStep
										? faArrowRight
										: faCheck
								}
								disabled={isLoading}
								onPress={next}
								// Grisé sans être bloqué : l'appui montre ce qui manque.
								style={[
									styles.outlineSubmit,
									(!isStepValid || duplicateProfile) &&
										styles.outlineDimmed
								]}
							/>
						</View>
					</View>
				</Pressable>
			</ScrollView>
			<BusyOverlay visible={isLoading} message={busyMessage} />
		</KeyboardAvoidingView>
	);
}

/**
 * Pourquoi la box est en `recovery`, quand c'est utile à l'utilisateur : le
 * réseau qu'elle n'a pas su rejoindre. Rien pour un passage manuel.
 */
function recoveryBanner(boxMode: BoxMode | null): string | undefined {
	if (boxMode?.recoveryReason !== 'connection-failed') return undefined;
	return boxMode.ssid
		? i18n.t('access:boxConfig.recoveryFailed', {ssid: boxMode.ssid})
		: i18n.t('access:boxConfig.recoveryFailedNoSsid');
}

/** Pastille de l'étape : l'étiquette pour le mot de passe imprimé dessus. */
function stepIcon(step: BoxConfigurationStep, firstConnection: boolean) {
	if (step === 'wifi') return 'wifi';
	if (step === 'ownership' && firstConnection) return 'tag';
	return 'lock';
}

/**
 * Titre de l'étape et, en `setup`, la progression de l'assistant. En
 * `recovery`, le bandeau dit pourquoi la box redemande son Wi-Fi.
 */
const StepHeader = ({
	headerKey: key,
	icon,
	subtitle,
	info,
	index,
	total,
	banner
}: {
	/** `boxConfig.<headerKey>Title` / `…Subtitle` : l'étape, ou la variante `recovery`. */
	headerKey: BoxConfigurationStep | 'recovery';
	icon: string;
	/** Sous-titre ; absent, rien n'est affiché sous le titre. */
	subtitle?: string;
	/** Encadré d'information sous le titre. */
	info?: string;
	index: number;
	total: number;
	banner?: string;
}) => {
	const {t} = useTranslation('access');
	return (
		<View style={styles.header}>
			<View style={styles.badge}>
				<Icon name={icon} size={26} color={COLORS.primary} />
			</View>
			<StepProgress index={index} total={total} />
			<Text style={accessStyles.title}>{t(`boxConfig.${key}Title`)}</Text>
			{subtitle ? (
				<Text style={[accessStyles.body, {marginTop: 6}]}>
					{subtitle}
				</Text>
			) : null}
			{info ? <InfoBox message={info} /> : null}
			{banner ? (
				<View style={styles.banner}>
					<Icon
						name="exclamation-triangle"
						size={16}
						color="#dd6b20"
					/>
					<Text style={styles.bannerText}>{banner}</Text>
				</View>
			) : null}
		</View>
	);
};

/**
 * Libellé au-dessus d'un champ, au style commun de l'application
 * (`InputStyle.textInput`) : le placeholder disparaît dès la saisie.
 */
const FieldLabel = ({text, optional}: {text: string; optional?: string}) => (
	<Text style={[InputStyle.textInput, styles.label]}>
		{text}
		{optional ? (
			<Text style={styles.labelOptional}> · {optional}</Text>
		) : null}
	</Text>
);

/** Champ secret, avec un œil pour vérifier ce qui a été tapé. */
const PasswordField = ({
	invalid,
	...inputProps
}: TextInputProps & {invalid?: boolean}) => {
	const [visible, setVisible] = React.useState(false);
	const {t} = useTranslation('access');
	return (
		<View
			style={[
				styles.field,
				styles.passwordField,
				invalid && styles.fieldInvalid
			]}>
			<TextInput
				{...inputProps}
				style={styles.passwordInput}
				placeholderTextColor={placeholderColor}
				secureTextEntry={!visible}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<TouchableOpacity
				onPress={() => setVisible(v => !v)}
				hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
				accessibilityRole="button"
				accessibilityLabel={t(
					visible
						? 'boxConfig.hidePassword'
						: 'boxConfig.showPassword'
				)}>
				<Icon
					name={visible ? 'eye-slash' : 'eye'}
					size={16}
					color={COLORS.primary}
				/>
			</TouchableOpacity>
		</View>
	);
};

/**
 * Pastille d'un réseau : « connecté » si la box y est (`isConnected`), ce qui
 * suppose qu'elle le connaît ; sinon « déjà configuré » (`isConfigured`).
 */
const NetworkTag = ({network}: {network: NetworkOption}) => {
	const {t} = useTranslation('access');
	if (!network.isConnected && !network.isConfigured) return null;
	const color = network.isConnected ? COLORS.success : COLORS.accent;
	return (
		<View style={[styles.configuredTag, {borderColor: color}]}>
			<Icon
				name={network.isConnected ? 'wifi' : 'check-circle'}
				size={12}
				color={color}
				solid
			/>
			<Text style={[styles.configuredTagText, {color}]}>
				{t(
					network.isConnected
						? 'boxConfig.connectedTag'
						: 'boxConfig.configuredTag'
				)}
			</Text>
		</View>
	);
};

/** Message d'erreur sous un champ, ou rien du tout — la place n'est pas réservée. */
const FieldError = ({message}: {message?: string}) =>
	message ? <Text style={styles.fieldError}>{message}</Text> : null;

/**
 * La box a déjà renvoyé deux formes pour cette route : un tableau d'objets
 * (`{name, isConfigured, isConnected, in-use}`) et un tableau
 * de chaînes. Les deux sont acceptées plutôt que d'imposer un firmware précis.
 */
function parseNetworks(body: string): NetworkOption[] {
	const parsed = JSON.parse(body);
	const list = Array.isArray(parsed)
		? parsed
		: Array.isArray(parsed?.networks)
		? parsed.networks
		: [];

	return list
		.map((entry: any): NetworkOption | null => {
			if (typeof entry === 'string') {
				return {
					label: entry,
					value: entry,
					isConfigured: false,
					isConnected: false
				};
			}
			const value = entry?.name ?? entry?.ssid;
			if (typeof value !== 'string' || value === '') return null;

			return {
				label: value,
				value,
				isConfigured: Boolean(entry?.isConfigured),
				isConnected: Boolean(entry?.isConnected)
			};
		})
		.filter((option: NetworkOption | null): option is NetworkOption =>
			Boolean(option)
		);
}

/**
 * Sur quel réseau le téléphone a-t-il atterri après le point d'accès ?
 *
 * `unknown` n'est pas un échec : toutes les plateformes ne savent pas nommer le
 * réseau courant — iOS n'a pas de pilote hotspot et ne répond jamais. C'est la
 * recherche de la box qui tranchera. Seul `elsewhere` est un constat d'échec.
 */
type PhoneOutcome =
	| {kind: 'joined'; ssid: string}
	| {kind: 'unknown'}
	| {kind: 'elsewhere'; ssid: string};

/** Attend que le téléphone soit revenu sur `network`. */
async function waitForPhoneOn(
	network: string,
	alive: () => boolean
): Promise<PhoneOutcome> {
	let last: string | null = null;
	const found = await pollUntil<string>(
		async () => {
			const current = await hotspotService.getCurrentSsid();
			if (!current) return undefined;
			last = current;
			return sameNetwork(current, network) ? current : undefined;
		},
		{
			timeoutMs: PHONE_JOIN_MS,
			intervalMs: PHONE_PROBE_INTERVAL_MS,
			shouldContinue: alive
		}
	);
	if (found) return {kind: 'joined', ssid: found};
	return last ? {kind: 'elsewhere', ssid: last} : {kind: 'unknown'};
}

/** Deux noms de réseau désignent-ils le même ? */
function sameNetwork(a: string, b: string): boolean {
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const styles = StyleSheet.create({
	header: {
		alignItems: 'center',
		paddingHorizontal: 24
	},
	badge: {
		width: 64,
		height: 64,
		borderRadius: 0.5 * 64,
		justifyContent: 'center',
		alignItems: 'center',
		borderColor: COLORS.primary,
		borderWidth: 6
	},
	banner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		alignSelf: 'stretch',
		marginTop: 14,
		padding: 12,
		borderRadius: 12,
		backgroundColor: '#FFF4E5'
	},
	bannerText: {
		flex: 1,
		color: '#7b341e',
		fontSize: 14,
		lineHeight: 19
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: 'white',
		marginTop: 16,
		marginHorizontal: 20,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22,
		borderRadius: 12,
		padding: 20
	},
	// Seule la mise en place s'ajoute au style commun des libellés.
	label: {
		alignSelf: 'stretch',
		paddingHorizontal: 4
	},
	labelOptional: {
		fontWeight: 'normal'
	},
	input: {
		...inputText,
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	field: {
		...inputText,
		width: '100%',
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	passwordField: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	passwordInput: {
		...inputText,
		flex: 1,
		height: '100%',
		padding: 0
	},
	duplicateBox: {
		alignSelf: 'stretch',
		marginBottom: 4
	},
	reminderBox: {
		alignSelf: 'stretch'
	},
	reminderText: {
		color: WARNING_COLORS.text,
		fontSize: 14
	},
	fieldInvalid: {
		borderColor: COLORS.danger
	},
	fieldError: {
		alignSelf: 'stretch',
		color: COLORS.danger,
		fontSize: 13,
		marginTop: -4,
		paddingHorizontal: 4
	},
	hint: {
		alignSelf: 'stretch',
		color: '#4a5568',
		fontSize: 13,
		paddingHorizontal: 4
	},
	inlineLink: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 6,
		paddingVertical: 4,
		paddingHorizontal: 4
	},
	inlineLinkText: {
		color: COLORS.accent,
		fontSize: 14
	},
	summary: {marginTop: 8},
	summaryValue: {
		color: COLORS.primary,
		fontSize: 15,
		fontWeight: 'bold',
		marginBottom: 6
	},
	outlineSubmit: {
		alignSelf: 'stretch',
		justifyContent: 'center',
		marginTop: 8
	},
	outlineDimmed: {
		opacity: 0.5
	},
	fieldBox: {
		alignSelf: 'stretch'
	},
	networkName: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	networkLabel: {flexShrink: 1},
	scrollContent: {flexGrow: 1, paddingTop: 30, paddingBottom: 40},
	// Couvre tout l'écran, même quand le contenu est court.
	dismissArea: {flexGrow: 1},
	passwordDesc: {marginTop: 4},
	descRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	descText: {
		flex: 1,
		color: COLORS.primary,
		fontSize: 14,
		lineHeight: 19
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		alignSelf: 'stretch',
		paddingHorizontal: 4,
		marginTop: 8
	},
	toggleLabel: {
		flex: 1,
		marginBottom: 0
	},
	configuredTag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: COLORS.success
	},
	configuredTagText: {
		color: COLORS.success,
		fontSize: 12,
		fontWeight: 'bold'
	},
	dropdownHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	dropdown: {
		width: '100%',
		maxHeight: 200,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderTopWidth: 0,
		borderBottomLeftRadius: 12,
		borderBottomRightRadius: 12,
		backgroundColor: 'white'
	},
	dropdownItem: {
		paddingVertical: 12,
		paddingHorizontal: 12
	}
});

export default BoxConfiguration;
