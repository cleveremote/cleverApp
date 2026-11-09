import React, {useCallback, useEffect, useState} from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import Spinner from 'react-native-loading-spinner-overlay';
import i18n from 'i18next';
import {useTranslation} from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {hapticOptions} from '../../data/cycleTypes';
import type {QrScannerProps} from './qrScanner';
import {
	CleverBoxQrPayload,
	HotspotError,
	HotspotErrorCode,
	hotspotService,
	parseCleverBoxQr
} from '../../../services/hotspot';
import {boxGet} from '../../../services/http';
import {
	COLORS,
	Centered,
	LinkButton,
	PrimaryButton,
	accessStyles,
	openWifiSettings
} from './accessUi';

/** Route de la box interrogée par l'écran de test réseau. */
const TEST_URL = 'https://pi-dev-1.local/updater/getNetworksList';

/** Au-delà, une box injoignable ferait patienter indéfiniment. */
const TEST_TIMEOUT_MS = 10000;

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
	/** Manual check that a plain HTTPS call to the box goes through. */
	| 'test'
	| 'error';

/** Every failure the flow can surface, phrased for the person holding the phone. */
const errorHint = (code: HotspotErrorCode) =>
	i18n.t(`access:hotspotError.${code}`);

type ScannerComponent = React.ComponentType<QrScannerProps>;

export function ScanBoxScreen(props: any) {
	const {t} = useTranslation(['access', 'common']);
	const nav = useNavigation();
	const isFocused = useIsFocused();

	const [phase, setPhase] = useState<Phase>('loading');
	const [error, setError] = useState<string>('');
	const [payload, setPayload] = useState<CleverBoxQrPayload | null>(null);
	const [Scanner, setScanner] = useState<ScannerComponent | null>(null);
	const [testRunning, setTestRunning] = useState(false);
	const [testResult, setTestResult] = useState<string>('');

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
	 * Appel HTTPS brut vers la box, en dehors du socket : il vérifie d'un coup la
	 * résolution du nom `.local`, la confiance dans la CA privée et la route
	 * elle-même. La réponse — ou l'erreur — est affichée telle quelle, c'est ce
	 * qui permet de distinguer les trois cas.
	 */
	const runNetworksListTest = useCallback(async () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setTestRunning(true);
		setTestResult('');

		try {
			const {status, body: raw} = await boxGet(TEST_URL, TEST_TIMEOUT_MS);

			let body = raw;
			try {
				body = JSON.stringify(JSON.parse(raw), null, 2);
			} catch {
				// Pas du JSON : le corps brut reste la meilleure information.
			}

			setTestResult(`HTTP ${status}\n\n${body}`);
		} catch (e) {
			console.warn('[ScanBox] test getNetworksList:', e);
			const err = e instanceof Error ? e : new Error(String(e));
			setTestResult(
				err.name === 'AbortError'
					? t('scan.testTimeout', {seconds: TEST_TIMEOUT_MS / 1000, url: TEST_URL})
					: `${err.name}: ${err.message}`
			);
		} finally {
			setTestRunning(false);
		}
	}, [t]);

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

			try {
				await hotspotService.join(decoded);
				setPhase('done');
				// Le téléphone est sur le hotspot : la box est joignable en
				// HTTPS, c'est là que le formulaire de configuration se remplit.
				props.navigation.navigate('BoxConfiguration', {
					deviceId: decoded.deviceId
				});
			} catch (e) {
				const hotspotError =
					e instanceof HotspotError
						? e
						: new HotspotError('UNKNOWN', String(e));

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

	// ------------------------------------------------------------------ render

	if (phase === 'unavailable') {
		return (
			<Centered>
				<Icon name="camera" size={40} color={COLORS.danger} />
				<Text style={styles.title}>{t('scan.cameraUnavailable')}</Text>
				<Text style={styles.body}>{t('scan.cameraModuleMissing')}</Text>
				<PrimaryButton
					label={t('common:back')}
					onPress={() => props.navigation.goBack()}
				/>
				<TouchableOpacity onPress={() => setPhase('test')}>
					<Text style={styles.link}>{t('scan.networkTest')}</Text>
				</TouchableOpacity>
			</Centered>
		);
	}

	if (phase === 'test') {
		return (
			<ScrollView
				style={styles.testScroll}
				contentContainerStyle={styles.testContent}>
				<Text style={styles.title}>{t('scan.networkTest')}</Text>
				<Text style={styles.body} selectable>
					{TEST_URL}
				</Text>

				<PrimaryButton
					label={testRunning ? t('scan.testRunning') : t('scan.runTest')}
					onPress={runNetworksListTest}
					disabled={testRunning}
				/>

				{testRunning ? (
					<ActivityIndicator
						style={styles.testSpinner}
						color={COLORS.primary}
					/>
				) : null}

				{testResult ? (
					<View style={styles.card}>
						<Text style={styles.result} selectable>
							{testResult}
						</Text>
					</View>
				) : null}

				<TouchableOpacity onPress={restart}>
					<Text style={styles.link}>{t('scan.backToScan')}</Text>
				</TouchableOpacity>
			</ScrollView>
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

				<LinkButton
					label={t('openWifiSettings')}
					onPress={openWifiSettings}
				/>

				<PrimaryButton
					label={t('scan.joinedNetwork')}
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.navigate('BoxConfiguration', {
							deviceId: payload.deviceId
						});
					}}
				/>
			</Centered>
		);
	}

	if (phase === 'error') {
		return (
			<Centered>
				<Icon
					name="exclamation-triangle"
					size={40}
					color={COLORS.danger}
				/>
				<Text style={styles.title}>{t('scan.pairingFailed')}</Text>
				<Text style={styles.body}>{error}</Text>
				<PrimaryButton label={t('common:retry')} onPress={restart} />
				<LinkButton
					label={t('openWifiSettings')}
					onPress={openWifiSettings}
				/>
				<TouchableOpacity onPress={() => setPhase('test')}>
					<Text style={styles.link}>{t('scan.networkTest')}</Text>
				</TouchableOpacity>
			</Centered>
		);
	}

	return (
		<View style={styles.fill}>
			<Spinner
				visible={phase === 'connecting'}
				color={COLORS.primary}
				textContent={t('scan.connecting')}
				textStyle={styles.spinnerText}
			/>
			{Scanner ? (
				// Le focus conditionne aussi `isActive` : sinon VisionCamera garde
				// la session caméra ouverte pendant qu'un autre écran est affiché.
				<Scanner
					isActive={isFocused && phase === 'scanning'}
					onScanned={pair}
				/>
			) : null}
			<TouchableOpacity
				style={styles.testLink}
				onPress={() => setPhase('test')}>
				<Text style={styles.testLinkText}>{t('scan.networkTest')}</Text>
			</TouchableOpacity>
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
// `accessUi` ; seuls ceux propres au scanner (viseur, écran de test) sont ici.
// La règle ne sait pas suivre la fusion et croit la feuille inutilisée.
/* eslint-disable react-native/no-unused-styles */
const styles = {
	...accessStyles,
	...StyleSheet.create({
		fill: {flex: 1, backgroundColor: COLORS.viewfinder},
		spinnerText: {color: COLORS.light, fontSize: 15},
		testScroll: {flex: 1},
		testContent: {
			alignItems: 'center',
			paddingHorizontal: 30,
			paddingVertical: 40
		},
		testSpinner: {marginTop: 20},
		result: {
			color: COLORS.primary,
			fontSize: 12,
			lineHeight: 17
		},
		testLink: {position: 'absolute', bottom: 40, alignSelf: 'center'},
		testLinkText: {
			color: COLORS.light,
			fontSize: 15,
			textDecorationLine: 'underline'
		}
	})
};

export default ScanBoxScreen;
