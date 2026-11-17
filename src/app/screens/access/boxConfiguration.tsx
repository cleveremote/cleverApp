import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React, {useCallback, useEffect, useRef} from 'react';
import {
	ActivityIndicator,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
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
import {InputStyle, placeholderColor, inputText} from '../../styles/components/common/Input';
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
	configureSendResult,
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
	accessStyles
} from './accessUi';
import {BoxHandover} from './boxHandover';
import {ErrorBox} from '../../components/common/ErrorBox';
import {
	WarningBox,
	WARNING_COLORS
} from '../../components/common/WarningBox';

/** Routes de la box appelées depuis cet écran. */
const NETWORKS_PATH = '/updater/getNetworksList';
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
 * Budget accordé à `configure`, envoyée sans être attendue : il borne surtout
 * le temps pendant lequel `BoxHandover` garde le hotspot pour elle. C'est
 * `getMode`, qu'il lit ensuite, qui dit ce que la configuration est devenue.
 */
const CONFIGURE_TIMEOUT_MS = 20000;

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
};

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
 * - `setup` : assistant en deux étapes — Wi-Fi, puis nom et nouveau mot de
 *   passe, obligatoire ;
 * - `recovery` : un seul écran, le Wi-Fi.
 *
 * Passer d'une étape à l'autre n'interroge pas la box. À la validation de la
 * dernière, le mot de passe qu'elle accepte aujourd'hui est demandé — celui
 * de l'étiquette en `setup`, celui de l'utilisateur en `recovery` — et part
 * avec le reste dans `configure`. L'écran d'état s'ouvre aussitôt, sans
 * attendre de réponse : c'est `getMode` qui y dit la suite, refus compris.
 *
 * Tout passe en HTTPS sur le hotspot, contrairement à `deviceSettings`, qui
 * fait la même chose en BLE. Les deux écrans coexistent : l'appairage BLE
 * reste utilisé par les box qui n'exposent pas de point d'accès.
 */
export function BoxConfiguration(props: any) {
	// `deviceId` du QR scanné : c'est sous lui que l'endpoint de la box est rangé.
	const deviceId: string | undefined = props.route?.params?.deviceId;
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
			setNetworks(parseNetworks(body));
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
		} else {
			setForm(previous => ({
				...previous,
				// Le réseau que la box n'a pas su rejoindre : le plus souvent,
				// c'est sa clé qui est à corriger, pas le réseau lui-même.
				ssid: previous.ssid || found.ssid || '',
				// Brouillon d'un `setup` dont la bascule a échoué : le mot de
				// passe de la box est alors celui qui venait d'être choisi.
				currentPassword: previous.password || previous.currentPassword
			}));
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

	// Retour de « mot de passe oublié » : le mot de passe qui vient d'être
	// choisi est celui que la box accepte désormais.
	const resetPassword: string | undefined =
		props.route?.params?.resetPassword;
	useEffect(() => {
		if (!resetPassword) return;
		set('currentPassword', resetPassword);
		props.navigation.setParams({resetPassword: undefined});
		// `set` change à chaque rendu ; seule l'arrivée du paramètre compte.
	}, [resetPassword, props.navigation]);

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
			setStepIndex(BOX_CONFIGURATION_STEPS[mode].length - 1);
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
		if (returnReason) props.navigation.setParams({configureError: undefined});
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
	useEffect(() => hotspotService.onLost(() => hotspotService.disconnect()), []);

	const errors: BoxConfigurationErrors = {
		...validateBoxConfiguration(form, mode),
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
					mode === 'setup'
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
			ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
			setError(duplicateMessage);
			return;
		}

		setError('');
		setDropdownOpen(false);

		if (!isLastStep) {
			setStepIndex(index => index + 1);
			return;
		}

		// Garde-fou : un brouillon repris peut avoir laissé une étape précédente
		// invalide. On y retourne plutôt que d'envoyer — y compris pour le
		// nouveau mot de passe, qui ne se compare à celui de l'étiquette qu'une
		// fois ce dernier saisi.
		const firstInvalid = steps.findIndex(
			s => !isBoxConfigurationValid(stepErrors(errors, s))
		);
		if (firstInvalid >= 0) {
			touchAll(fieldsOfStep(steps[firstInvalid]));
			setStepIndex(firstInvalid);
			return;
		}

		configure();
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
			// GPS, le champ est alors simplement omis — même contrat que
			// l'appairage BLE. La box en déduit elle-même son fuseau horaire.
			const localCoordinates =
				mode === 'setup'
					? await coordinatesRef.current?.take(COORDINATES_GRACE_MS)
					: undefined;
			const url = await boxUrl(CONFIGURE_PATH, deviceId);
			const {status, body} = await boxPost(
				url,
				{...payload, ...(localCoordinates ? {localCoordinates} : {})},
				CONFIGURE_TIMEOUT_MS
			);
			const result = configureSendResult(status, body);
			if (result.kind !== 'accepted') {
				console.warn(
					`[BoxConfiguration] configure refusée — HTTP ${status} ${body.slice(0, 200)}`
				);
			}
			return result;
		} catch (e) {
			console.warn('[BoxConfiguration] configure (bascule ?):', e);
			return {kind: 'lost'};
		}
	};

	const configure = () => {
		if (sentRef.current) return;
		sentRef.current = true;

		// C'est l'identifiant de la box, et non l'email, qui sert de login.
		const login = form.boxIdentifier.trim();
		// En `recovery` rien n'est renommé : le profil existant garde son nom.
		const deviceName =
			mode === 'setup' ? form.deviceName.trim() : savedProfile ?? login;
		const email = form.email.trim();

		// Retenu avant l'envoi : à partir d'ici le formulaire cède la place à
		// la progression, et c'est le brouillon qui rendra la saisie si la
		// bascule échoue.
		saveBoxConfigurationDraft(form);

		// `recovery` n'envoie que le sous-ensemble Wi-Fi : la box garde son nom,
		// son compte et son mot de passe. Le mot de passe actuel n'a été vérifié
		// par aucun appel : c'est `configure` qui l'accepte ou le refuse.
		setPendingConfiguration(
			sendConfiguration(
				mode === 'setup'
					? {
							deviceName,
							ssid: form.ssid,
							psk: form.psk,
							login,
							...(email ? {email} : {}),
							currentPassword: form.currentPassword,
							password: form.password
					  }
					: {
							ssid: form.ssid,
							psk: form.psk,
							login,
							currentPassword: form.currentPassword
					  }
			)
		);

		// Le nom de la box sert aussi de nom de profil. En `recovery`, un profil
		// existant est déjà juste ; une box réparée depuis un téléphone qui ne
		// la connaissait pas y gagne un profil. Il n'est pas créé ici mais par
		// `BoxHandover`, une fois la box confirmée sur le réseau : une bascule
		// qui échoue ne laisse ainsi aucun profil derrière elle.
		setPendingProfile(
			mode === 'setup' || !savedProfile
				? {
						deviceName,
						login,
						password:
							mode === 'setup' ? form.password : form.currentPassword
				  }
				: null
		);

		// La progression s'affiche ici même, comme dernière étape de
		// l'assistant. Plus de retour possible vers le formulaire : il n'a plus
		// de réseau pour travailler une fois le point d'accès fermé, et toutes
		// les sorties de `BoxHandover` remplacent la pile.
		Keyboard.dismiss();
		setHandover({
			deviceName,
			ssid: form.ssid,
			login,
			deviceId,
			// Résultat déjà publié avant cet envoi : il ne doit pas passer pour
			// le sien.
			staleStartedAt: boxMode?.configure?.startedAt ?? null,
			stepTotal: steps.length + 1
		});
	};

	if (handover) {
		return (
			<BoxHandover navigation={props.navigation} route={{params: handover}} />
		);
	}

	if (phase === 'detecting') {
		return (
			<Centered>
				<ActivityIndicator size="large" color={COLORS.primary} />
				<Text style={accessStyles.title}>{detectingMessage}</Text>
				<Text style={accessStyles.body}>{t('boxConfig.detectingHint')}</Text>
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
		networks.find(n => n.value === form.ssid)?.label ||
		form.ssid ||
		t('boxConfig.wifiNetwork');

	const renderWifi = () => (
		<>
			{duplicateMessage ? (
				<ErrorBox message={duplicateMessage} style={styles.duplicateBox} />
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
						setDropdownOpen(!dropdownOpen);
					}}>
					<View style={styles.dropdownHeader}>
						<Text style={[inputText, !form.ssid && {color: placeholderColor}]}>
							{selectedLabel}
						</Text>
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
								<Text style={{fontSize: 18, color: placeholderColor}}>
									{t('boxConfig.noNetwork')}
								</Text>
							</TouchableOpacity>
						) : (
							<FlatList
								data={networks}
								keyExtractor={(_item, index) => 'network_' + index}
								renderItem={({item}: {item: NetworkOption}) => (
									<TouchableOpacity
										style={[
											styles.dropdownItem,
											item.value === form.ssid && {
												backgroundColor: '#EDF2F7'
											}
										]}
										onPress={() => {
											set('ssid', item.value);
											setDropdownOpen(false);
										}}>
										<Text style={{fontSize: 18}}>{item.label}</Text>
									</TouchableOpacity>
								)}
							/>
						)}
					</View>
				)}
			</View>
			<FieldError message={errorFor('ssid')} />
			{networks.length > 0 ? (
				<TouchableOpacity style={styles.inlineLink} onPress={loadNetworks}>
					<Icon name="sync-alt" size={12} color={COLORS.accent} />
					<Text style={styles.inlineLinkText}>
						{t('boxConfig.refreshNetworks')}
					</Text>
				</TouchableOpacity>
			) : null}

			<FieldLabel text={t('boxConfig.psk')} />
			<PasswordField
				invalid={Boolean(errorFor('psk'))}
				placeholder={t('boxConfig.psk')}
				textContentType="password"
				value={form.psk}
				onChangeText={value => set('psk', value)}
			/>
			<FieldError message={errorFor('psk')} />
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

			<FieldLabel text={t('boxConfig.email')} optional={t('boxConfig.optional')} />
			<TextInput
				style={[styles.field, errorFor('email') ? styles.fieldInvalid : null]}
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
					{t('boxConfig.passwordRules', {min: PASSWORD_MIN_LENGTH})}
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

			<DescBox style={styles.summary}>
				<Text style={accessStyles.cardLabel}>{t('boxConfig.boxIdentifier')}</Text>
				<Text style={styles.summaryValue}>{form.boxIdentifier}</Text>
				<Text style={accessStyles.cardLabel}>{t('boxConfig.wifiNetwork')}</Text>
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
	 * Dernière étape : le mot de passe que la box accepte aujourd'hui. C'est
	 * sa validation qui envoie la configuration.
	 */
	const renderOwnership = () => (
		<>
			<FieldLabel
				text={t(
					mode === 'setup' ? 'boxConfig.labelPassword' : 'boxConfig.boxPassword'
				)}
			/>
			<PasswordField
				autoFocus={true}
				invalid={Boolean(errorFor('currentPassword'))}
				placeholder={t(
					mode === 'setup' ? 'boxConfig.labelPassword' : 'boxConfig.boxPassword'
				)}
				textContentType="password"
				value={form.currentPassword}
				onChangeText={value => set('currentPassword', value)}
				onSubmitEditing={next}
				returnKeyType="done"
			/>
			{currentPasswordFeedback()}
			{mode === 'setup' ? (
				<View style={styles.hintRow}>
					<Icon name="tag" size={14} color={COLORS.primary} />
					<Text style={[styles.hint, {flex: 1}]}>
						{t('boxConfig.labelPasswordHint')}
					</Text>
				</View>
			) : (
				<>
					<Text style={styles.hint}>{t('boxConfig.boxPasswordHint')}</Text>
					<Text style={styles.hint}>
						{t('boxConfig.forgotPassword')}{' '}
						<Text
							style={styles.forgotLink}
							accessibilityRole="link"
							onPress={() =>
								props.navigation.navigate('ForgotPassword', {
									// L'identifiant vient du QR scanné : rien à
									// ressaisir.
									login: form.boxIdentifier.trim(),
									returnTo: 'BoxConfiguration'
								})
							}>
							{t('boxConfig.forgotPasswordAction')}
						</Text>
					</Text>
				</>
			)}
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
				contentContainerStyle={{paddingTop: 30, paddingBottom: 40}}
				keyboardShouldPersistTaps="handled">
				<StepHeader
					headerKey={mode === 'setup' ? step : 'recovery'}
					icon={stepIcon(step, mode)}
					subtitle={
						mode === 'setup' ? t(`boxConfig.${step}Subtitle`) : undefined
					}
					info={recoveryWifi ? t('boxConfig.existingAccount') : undefined}
					index={stepIndex}
					// L'écran de bascule est la dernière étape de l'assistant.
					total={steps.length + 1}
					banner={recoveryWifi ? recoveryBanner(boxMode) : undefined}
				/>

				<View style={styles.card}>
					<View style={{gap: 8, alignItems: 'center'}}>
						<DangerBox message={lastFailure} />

						{renderStep()}

						<DangerBox message={error} />

						<OutlineButton
							label={t(
								!isLastStep
									? 'boxConfig.continue'
									: mode === 'setup'
									? 'boxConfig.configure'
									: 'boxConfig.reconnect'
							)}
							icon={
								!isLastStep ? faArrowRight : mode === 'setup' ? faCheck : faWifi
							}
							disabled={isLoading}
							onPress={next}
							// Grisé sans être bloqué : l'appui montre ce qui manque.
							style={[
								styles.outlineSubmit,
								(!isStepValid || duplicateProfile) && styles.outlineDimmed
							]}
						/>
					</View>
				</View>
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
function stepIcon(step: BoxConfigurationStep, mode: BoxConfigurationMode) {
	if (step === 'wifi') return 'wifi';
	if (step === 'ownership' && mode === 'setup') return 'tag';
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
				<Text style={[accessStyles.body, {marginTop: 6}]}>{subtitle}</Text>
			) : null}
			{info ? <InfoBox message={info} /> : null}
			{banner ? (
				<View style={styles.banner}>
					<Icon name="exclamation-triangle" size={16} color="#dd6b20" />
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
		{optional ? <Text style={styles.labelOptional}> · {optional}</Text> : null}
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
			style={[styles.field, styles.passwordField, invalid && styles.fieldInvalid]}>
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
					visible ? 'boxConfig.hidePassword' : 'boxConfig.showPassword'
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

/** Message d'erreur sous un champ, ou rien du tout — la place n'est pas réservée. */
const FieldError = ({message}: {message?: string}) =>
	message ? <Text style={styles.fieldError}>{message}</Text> : null;

/**
 * La box a déjà renvoyé deux formes pour cette route : un tableau d'objets
 * (`{name, isConfigured, in-use}`, comme la caractéristique BLE) et un tableau
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
				return {label: entry, value: entry};
			}
			const value = entry?.name ?? entry?.ssid;
			if (typeof value !== 'string' || value === '') return null;

			const tag =
				entry?.isConfigured && entry?.['in-use']
					? ` ${i18n.t('access:boxConfig.configuredTag')}`
					: '';
			return {label: `${value}${tag}`, value};
		})
		.filter((option: NetworkOption | null): option is NetworkOption =>
			Boolean(option)
		);
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
	forgotLink: {
		fontWeight: 'bold',
		textDecorationLine: 'underline'
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
	hintRow: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'stretch',
		gap: 6,
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
