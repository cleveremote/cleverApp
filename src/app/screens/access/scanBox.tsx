import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import i18n from 'i18next';
import {useTranslation} from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
	faArrowLeft,
	faCheck,
	faRotateRight,
	faUsers,
	faWifi
} from '@fortawesome/free-solid-svg-icons';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {findProfileByLogin} from '../../components/common/RememberMeManager';
import {ModalCard} from '../../components/common/ModalCard';
import {hapticOptions} from '../../data/cycleTypes';
import type {QrScannerProps} from './qrScanner';
import {
	CleverBoxQrPayload,
	HotspotError,
	HotspotErrorCode,
	hotspotService,
	parseCleverBoxQr
} from '../../../services/hotspot';
import {getBoxMode, pollUntil} from '../../../services/http';
import {
	BusyOverlay,
	COLORS,
	Centered,
	OutlineButton,
	WarningBox,
	accessStyles,
	WifiSettingsLink
} from './accessUi';

type Phase =
	/** Pulling in the camera module. */
	| 'loading'
	/** Camera live, looking for a QR code. */
	| 'scanning'
	/** QR decoded, joining the hotspot. */
	| 'connecting'
	/** Joined — moving on. */
	| 'done'
	/** This platform cannot join by itself: walk the user through it. */
	| 'manual'
	/** The native camera code is missing from this binary. */
	| 'unavailable'
	/** A profile already uses this box's identifier. */
	| 'duplicate'
	| 'error';

/** Every failure the flow can surface, phrased for the person holding the phone. */
const errorHint = (code: HotspotErrorCode) =>
	i18n.t(`access:hotspotError.${code}`);

type ScannerComponent = React.ComponentType<QrScannerProps>;

/**
 * Budget de la sonde qui cherche la box sur le réseau courant, avant de
 * rejoindre son point d'accès. Court : ailleurs, mDNS échoue vite, et chaque
 * seconde ici retarde le cas courant.
 */
const LAN_PROBE_TIMEOUT_MS = 3000;

/**
 * Vrai quand la box répond déjà sur le réseau du téléphone, sans son point
 * d'accès. Un téléphone déjà sur ce point d'accès ne compte pas : il faut le
 * rejoindre pour y lier le trafic de l'application (Android).
 */
async function reachableWithoutHotspot(
	decoded: CleverBoxQrPayload
): Promise<boolean> {
	const current = await hotspotService.getCurrentSsid().catch(() => null);
	if (
		current &&
		current.trim().toLowerCase() === decoded.ssid.trim().toLowerCase()
	) {
		return false;
	}
	try {
		return (await getBoxMode(decoded.deviceId, LAN_PROBE_TIMEOUT_MS)) !== null;
	} catch {
		return false;
	}
}


/**
 * Budget de la sonde, une fois le hotspot rejoint : le temps que mDNS y
 * résolve le nom de la box.
 */
const HOTSPOT_PROBE_TIMEOUT_MS = 8000;

/**
 * Budget total pour trouver la box sur son hotspot : le temps de l'allumer
 * (appui long sur son bouton Wi-Fi) pendant que la popin attend.
 */
const HOTSPOT_WAIT_TIMEOUT_MS = 120000;
const HOTSPOT_RETRY_INTERVAL_MS = 2000;

/**
 * « Changer le Wi-Fi » d'une box déjà enregistrée :
 * - `checking` — le téléphone est peut-être déjà sur le hotspot : vérifié
 *   avant toute popin ;
 * - `prompt` — la popin dit comment allumer le hotspot, avant toute recherche ;
 * - `searching` — Android cherche le hotspot dans sa propre fenêtre, qui passe
 *   devant tout : la popin s'efface, cette fenêtre a son « Annuler » ;
 * - `waitingBox` — le téléphone est sur le hotspot, la popin attend la box.
 */
type HotspotStep =
	| 'idle'
	| 'checking'
	| 'prompt'
	| 'searching'
	| 'waitingBox';

export function ScanBoxScreen(props: any) {
	const {t} = useTranslation(['access', 'common']);
	const nav = useNavigation();
	const isFocused = useIsFocused();

	const [phase, setPhase] = useState<Phase>('loading');
	const [error, setError] = useState<string>('');
	// Profil qui porte déjà l'identifiant de la box scannée.
	const [duplicateProfile, setDuplicateProfile] = useState<string>('');
	const [payload, setPayload] = useState<CleverBoxQrPayload | null>(null);
	const [Scanner, setScanner] = useState<ScannerComponent | null>(null);
	// Box déjà enregistrée, « Changer le Wi-Fi » : où en est la recherche.
	const [hotspotStep, setHotspotStep] = useState<HotspotStep>('idle');
	// Numéro de la tentative en cours : « Annuler » ou le démontage l'avancent,
	// et la tentative qui n'est plus la courante s'arrête.
	const hotspotAttempt = useRef(0);
	useEffect(
		() => () => {
			hotspotAttempt.current++;
		},
		[]
	);

	useEffect(() => {
		nav.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [nav, props.navigation]);

	// VisionCamera reads its native constants at import time, so requiring it
	// from a binary that does not embed the native code throws immediately.
	// Loading it here — rather than at the top of the file — keeps that failure
	// inside this screen instead of crashing the whole AccessStack.
	useEffect(() => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const mod = require('./qrScanner');
			// setState with a function argument would call it as an updater.
			setScanner(() => mod.QrScanner as ScannerComponent);
			setPhase('scanning');
		} catch (e) {
			console.warn('[ScanBox] camera module unavailable:', e);
			setPhase('unavailable');
		}
	}, []);

	const restart = useCallback(() => {
		setError('');
		setPayload(null);
		setPhase('scanning');
	}, []);

	// L'écran reste monté sous celui de configuration : au retour, la phase vaut
	// encore 'done' (ou 'connecting' / 'manual') et la caméra est donc restée en
	// pause. Sans ce réarmement, revenir en arrière donne un scanner mort.
	useEffect(() => {
		if (!isFocused) return;
		setPhase(current =>
			current === 'done' ||
			current === 'connecting' ||
			current === 'manual'
				? 'scanning'
				: current
		);
	}, [isFocused]);

	/**
	 * Ouvre la configuration de la box : directement si elle répond déjà sur le
	 * réseau du téléphone, après avoir rejoint son hotspot sinon. Dans les deux
	 * cas, l'assistant commence par le choix du réseau.
	 */
	const joinBox = useCallback(
		async (decoded: CleverBoxQrPayload) => {
			setPhase('connecting');

			// L'endpoint d'abord : c'est lui que la sonde interroge.
			await hotspotService.rememberEndpoint(decoded);
			if (await reachableWithoutHotspot(decoded)) {
				setPhase('done');
				props.navigation.navigate('BoxConfiguration', {
					deviceId: decoded.deviceId,
					devicePassword: decoded.devicePassword
				});
				return;
			}

			try {
				await hotspotService.join(decoded);
				setPhase('done');
				// Le téléphone est sur le hotspot : la box est joignable en
				// HTTPS, c'est là que le formulaire de configuration se remplit.
				props.navigation.navigate('BoxConfiguration', {
					deviceId: decoded.deviceId,
					devicePassword: decoded.devicePassword
				});
			} catch (e) {
				const hotspotError =
					e instanceof HotspotError
						? e
						: new HotspotError('UNKNOWN', String(e));

				// Une demande de réseau restée en suspens — fenêtre système
				// fermée par le verrouillage du téléphone, par exemple — ferait
				// guetter ce SSID à Android au lieu de rendre la main au Wi-Fi
				// enregistré.
				await hotspotService.disconnect();

				// The endpoint is already saved by now, so on a platform that
				// cannot join a network itself the flow still completes — the
				// user just joins the hotspot by hand.
				if (hotspotError.code === 'NOT_IMPLEMENTED') {
					setPhase('manual');
					return;
				}

				setError(errorHint(hotspotError.code) || hotspotError.message);
				setPhase('error');
			}
		},
		[props.navigation]
	);

	const pair = useCallback(
		async (raw: string) => {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			setPhase('connecting');

			// Decoded separately from the join so the manual path below still has
			// the SSID and passphrase to show when the driver cannot connect.
			let decoded: CleverBoxQrPayload;
			try {
				decoded = parseCleverBoxQr(raw);
				setPayload(decoded);
			} catch (e) {
				const parseError =
					e instanceof HotspotError
						? e
						: new HotspotError('INVALID_QR', String(e));
				setError(parseError.message || errorHint('INVALID_QR'));
				setPhase('error');
				return;
			}

			// Premier contrôle, avant même le hotspot : un profil porte déjà
			// l'identifiant de cette box. Lu sans le trousseau, donc sans
			// demande de Face ID.
			const login = decoded.deviceId.trim().replace(/\.local$/i, '');
			const existing = await findProfileByLogin(login);
			if (existing) {
				ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
				setDuplicateProfile(existing);
				setPhase('duplicate');
				return;
			}

			await joinBox(decoded);
		},
		[joinBox]
	);

	// QR code lu par l'appareil photo du téléphone : le lien ouvre l'application
	// sur cet écran avec son contenu (voir `linking` dans routes/index.tsx), et
	// l'appairage se déroule comme après un scan fait ici. Le paramètre est
	// retiré aussitôt, pour qu'un retour sur l'écran ne le rejoue pas et qu'un
	// second scan du même code reparte bien.
	const linkedQr: string | undefined = props.route?.params?.qr;
	useEffect(() => {
		if (!linkedQr) return;
		props.navigation.setParams({qr: undefined});
		pair(linkedQr);
	}, [linkedQr, pair, props.navigation]);

	/**
	 * Box déjà enregistrée : rejoint explicitement le hotspot du QR, attend que
	 * la box y réponde, puis ouvre sa configuration au choix du réseau. Échec :
	 * son hotspot est sans doute éteint ; la popin l'a dit pendant l'attente, il
	 * suffit de rappuyer une fois allumé.
	 */
	const changeWifi = useCallback(
		async (decoded: CleverBoxQrPayload) => {
			const attempt = ++hotspotAttempt.current;
			const current = () => hotspotAttempt.current === attempt;
			setHotspotStep('searching');

			// Une seule demande de réseau, sur tout le budget : sur Android,
			// chacune ouvre la fenêtre système de recherche, qui passe devant la
			// popin. Elle attend que le hotspot soit allumé.
			const deadline = Date.now() + HOTSPOT_WAIT_TIMEOUT_MS;
			let mode;
			try {
				await hotspotService.join(decoded, {
					timeoutMs: HOTSPOT_WAIT_TIMEOUT_MS
				});
				if (current()) setHotspotStep('waitingBox');
				// Sur le hotspot : seule la box est attendue, sans rejoindre.
				mode = await pollUntil(
					async () =>
						(await getBoxMode(
							decoded.deviceId,
							HOTSPOT_PROBE_TIMEOUT_MS
						)) ?? undefined,
					{
						timeoutMs: Math.max(deadline - Date.now(), 0),
						intervalMs: HOTSPOT_RETRY_INTERVAL_MS,
						shouldContinue: current
					}
				);
			} catch {
				mode = undefined;
			}

			// Une demande de réseau restée en suspens ferait guetter ce SSID à
			// Android au lieu de rendre la main au Wi-Fi enregistré.
			if (!mode || !current()) {
				await hotspotService.disconnect().catch(() => undefined);
			}

			// Annulée entre-temps : « Annuler » a déjà rendu la main.
			if (!current()) return;
			setHotspotStep('idle');

			if (!mode) {
				ReactNativeHapticFeedback.trigger('notificationWarning', hapticOptions);
				return;
			}
			setPhase('done');
			props.navigation.navigate('BoxConfiguration', {
				deviceId: decoded.deviceId,
				devicePassword: decoded.devicePassword
			});
		},
		[props.navigation]
	);

	/**
	 * Avant la popin : le téléphone est déjà sur le hotspot de la box et elle y
	 * répond ? Alors sa configuration s'ouvre directement, sans recherche.
	 */
	const startChangeWifi = useCallback(
		async (decoded: CleverBoxQrPayload) => {
			const attempt = ++hotspotAttempt.current;
			setHotspotStep('checking');
			let ready = false;
			const ssid = await hotspotService.getCurrentSsid().catch(() => null);
			if (
				ssid &&
				ssid.trim().toLowerCase() === decoded.ssid.trim().toLowerCase()
			) {
				await hotspotService.rememberEndpoint(decoded).catch(() => undefined);
				ready = await getBoxMode(decoded.deviceId, LAN_PROBE_TIMEOUT_MS)
					.then(mode => mode !== null)
					.catch(() => false);
			}
			if (hotspotAttempt.current !== attempt) return;
			if (!ready) {
				setHotspotStep('prompt');
				return;
			}
			setHotspotStep('idle');
			setPhase('done');
			props.navigation.navigate('BoxConfiguration', {
				deviceId: decoded.deviceId,
				devicePassword: decoded.devicePassword
			});
		},
		[props.navigation]
	);

	/** Abandonne la tentative en cours et rend le Wi-Fi habituel. */
	const cancelChangeWifi = useCallback(() => {
		hotspotAttempt.current++;
		setHotspotStep('idle');
		hotspotService.disconnect().catch(() => undefined);
	}, []);

	// ------------------------------------------------------------------ render

	if (phase === 'unavailable') {
		return (
			<Centered>
				<Icon name="camera" size={40} color={COLORS.danger} />
				<Text style={styles.title}>{t('scan.cameraUnavailable')}</Text>
				<Text style={styles.body}>{t('scan.cameraModuleMissing')}</Text>
				<OutlineButton
					label={t('common:back')}
					icon={faArrowLeft}
					onPress={() => props.navigation.goBack()}
				/>
			</Centered>
		);
	}

	if (phase === 'manual' && payload) {
		return (
			<Centered>
				<Icon name="wifi" size={40} color={COLORS.primary} />
				<Text style={styles.title}>{t('scan.joinBoxNetwork')}</Text>
				<Text style={styles.body}>{t('scan.joinManually')}</Text>

				<View style={styles.card}>
					<Text style={styles.cardLabel}>{t('scan.network')}</Text>
					<Text style={styles.cardValue} selectable>
						{payload.ssid}
					</Text>
					<Text style={styles.cardLabel}>{t('common:password')}</Text>
					<Text style={styles.cardValue} selectable>
						{payload.password}
					</Text>
				</View>

				<TouchableOpacity
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						copyToClipboard(payload.password);
					}}>
					<Text style={styles.link}>{t('scan.copyPassword')}</Text>
				</TouchableOpacity>

				<WifiSettingsLink />

				<OutlineButton
					label={t('scan.joinedNetwork')}
					icon={faCheck}
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.navigate('BoxConfiguration', {
							deviceId: payload.deviceId,
							devicePassword: payload.devicePassword
						});
					}}
				/>
			</Centered>
		);
	}

	if (phase === 'duplicate' && payload) {
		return (
			<Centered>
				<View style={styles.titleRow}>
					<Icon
						name="exclamation-circle"
						size={22}
						color={COLORS.warning}
					/>
					<Text style={[styles.title, styles.titleInRow]}>
						{t('scan.duplicateTitle')}
					</Text>
				</View>
				<View style={styles.errorBox}>
					<WarningBox
						message={t('scan.duplicateBody', {profile: duplicateProfile})}
					/>
				</View>
				<OutlineButton
					label={t('scan.goToProfiles')}
					icon={faUsers}
					onPress={() => props.navigation.navigate('Profiles')}
				/>
				<OutlineButton
					label={t('scan.changeWifiOnly')}
					icon={faWifi}
					busy={hotspotStep !== 'idle' && hotspotStep !== 'prompt'}
					onPress={() => startChangeWifi(payload)}
				/>
				<ModalCard
					isOpen={hotspotStep === 'prompt' || hotspotStep === 'waitingBox'}
					onClose={cancelChangeWifi}
					title={
						hotspotStep === 'waitingBox'
							? t('scan.waitingBoxTitle')
							: t('scan.hotspotPromptTitle')
					}
					message={
						hotspotStep === 'waitingBox'
							? t('scan.waitingBox', {ssid: payload.ssid})
							: t('scan.hotspotPrompt', {ssid: payload.ssid})
					}>
					{hotspotStep === 'waitingBox' ? (
						<ActivityIndicator
							style={styles.modalSpinner}
							size="large"
							color={COLORS.primary}
						/>
					) : (
						<OutlineButton
							label={t('scan.searchHotspot')}
							icon={faWifi}
							onPress={() => changeWifi(payload)}
						/>
					)}
				</ModalCard>
			</Centered>
		);
	}

	if (phase === 'error') {
		return (
			<Centered>
				<View style={styles.titleRow}>
					<Icon
						name="exclamation-circle"
						size={22}
						color={COLORS.warning}
					/>
					<Text style={[styles.title, styles.titleInRow]}>
						{t('scan.pairingFailed')}
					</Text>
				</View>
				<View style={styles.errorBox}>
					<WarningBox message={error} />
				</View>
				<OutlineButton
					label={t('common:retry')}
					icon={faRotateRight}
					onPress={restart}
				/>
				<WifiSettingsLink />
			</Centered>
		);
	}

	return (
		<View style={styles.fill}>
			{/* Monté seulement pour viser : arrivé par le lien d'appairage, le code
			    est déjà lu, et le scanner demanderait la caméra pour rien. */}
			{Scanner && phase === 'scanning' ? (
				// Le focus conditionne aussi `isActive` : sinon VisionCamera garde
				// la session caméra ouverte pendant qu'un autre écran est affiché.
				<Scanner
					isActive={isFocused && phase === 'scanning'}
					onScanned={pair}
				/>
			) : null}
			<BusyOverlay
				visible={phase === 'connecting'}
				message={t('scan.connecting')}
			/>
		</View>
	);
}

/**
 * Reaching `Clipboard` off the react-native root logs a deprecation warning, so
 * it is touched only when the button is actually pressed rather than at import
 * time. The values are `selectable` too, which covers the case where a future
 * RN drops the module entirely.
 */
function copyToClipboard(value: string): void {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		require('react-native').Clipboard?.setString(value);
	} catch {
		// Non-critical: the passphrase is on screen and selectable.
	}
}

// Les styles partagés avec les autres écrans d'appairage viennent de
// `accessUi` ; seuls ceux propres au scanner (le viseur) sont ici.
// La règle ne sait pas suivre la fusion et croit la feuille inutilisée.
/* eslint-disable react-native/no-unused-styles */
const styles = {
	...accessStyles,
	...StyleSheet.create({
		fill: {flex: 1, backgroundColor: COLORS.viewfinder},
		titleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
		titleInRow: {marginTop: 0},
		modalSpinner: {marginVertical: 12},
		errorBox: {alignSelf: 'stretch', marginTop: 15}
	})
};

export default ScanBoxScreen;
