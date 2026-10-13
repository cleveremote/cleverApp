import {
	NativeEventEmitter,
	NativeModules,
	PermissionsAndroid,
	Platform
} from 'react-native';
import {HOTSPOT_MOCK} from '../../../config/websocket';
import {MockHotspotDriver, MockBehavior} from './MockHotspotDriver';
import {NativeHotspotDriver} from './NativeHotspotDriver';
import {StubHotspotDriver} from './StubHotspotDriver';
import {parseCleverBoxQr} from './parseQr';
import {saveBoxEndpoint} from './boxEndpoint';
import {
	CleverBoxQrPayload,
	HotspotConnectResult,
	HotspotDriver,
	HotspotError
} from './types';

export interface PairFromQrResult {
	payload: CleverBoxQrPayload;
	connection: HotspotConnectResult;
}

/** Évènement natif émis quand le réseau rejoint disparaît. */
const EVENT_LOST = 'hotspot/lost';

class HotspotService {
	private readonly mock = new MockHotspotDriver();
	private readonly driver: HotspotDriver;

	constructor() {
		this.driver = this.pickDriver();
	}

	private pickDriver(): HotspotDriver {
		if (HOTSPOT_MOCK) return this.mock;
		// iOS has no NEHotspotConfiguration module yet — see StubHotspotDriver.
		if (Platform.OS === 'ios') return new StubHotspotDriver();

		// A JS-only reload against a build that predates the native module would
		// otherwise blow up mid-flow; degrade to the manual path instead.
		if (!NativeModules.HotspotModule) return new StubHotspotDriver();
		return new NativeHotspotDriver();
	}

	/** Which driver is live — useful when reading logs from a device. */
	get driverName(): string {
		return this.driver.name;
	}

	/** Only meaningful while HOTSPOT_MOCK is on. */
	setMockBehavior(behavior: MockBehavior): void {
		this.mock.setBehavior(behavior);
	}

	/**
	 * Prévient quand le réseau rejoint disparaît. Le natif débinde alors le
	 * process (`bindProcessToNetwork(null)`), donc tout appel ultérieur repart
	 * par les données mobiles et n'atteint plus la box : sans cet abonnement,
	 * l'écran de configuration ne peut que constater un échec opaque.
	 *
	 * Renvoie la fonction de désabonnement. Ne fait rien là où le module natif
	 * n'existe pas (iOS, build sans le module) — le hotspot y est rejoint à la
	 * main, il n'y a pas de binding à perdre.
	 */
	onLost(listener: (ssid: string) => void): () => void {
		if (!NativeModules.HotspotModule) return () => undefined;

		const emitter = new NativeEventEmitter(NativeModules.HotspotModule);
		const subscription = emitter.addListener(
			EVENT_LOST,
			(event: {ssid?: string}) => listener(event?.ssid ?? '')
		);
		return () => subscription.remove();
	}

	isSupported(): Promise<boolean> {
		return this.driver.isSupported();
	}

	getCurrentSsid(): Promise<string | null> {
		return this.driver.getCurrentSsid();
	}

	disconnect(): Promise<void> {
		return this.driver.disconnect();
	}

	/**
	 * Requests what Android needs to *join* a network programmatically. This is
	 * separate from the camera permission, which the scanning screen asks for
	 * through VisionCamera.
	 *
	 * API 33+ replaced the location requirement with NEARBY_WIFI_DEVICES; below
	 * that, `requestNetwork` with a WifiNetworkSpecifier needs fine location.
	 */
	private async requestJoinPermission(): Promise<void> {
		if (Platform.OS !== 'android') return;

		const apiLevel = Number(Platform.Version);
		const permission =
			apiLevel >= 33
				? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES
				: PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;

		const result = await PermissionsAndroid.request(permission);
		if (result !== PermissionsAndroid.RESULTS.GRANTED) {
			throw new HotspotError(
				'PERMISSION_DENIED',
				apiLevel >= 33
					? "L'accès aux appareils Wi-Fi à proximité est nécessaire pour rejoindre la box."
					: "L'accès à la position est nécessaire pour rejoindre le réseau de la box."
			);
		}
	}

	/**
	 * Remembers where the box lives, then joins its hotspot.
	 *
	 * The endpoint is persisted *before* the join is attempted, on purpose: when
	 * the driver cannot join (iOS today) the user does it by hand, and the
	 * socket must already point at the right box when they come back.
	 */
	async join(payload: CleverBoxQrPayload): Promise<HotspotConnectResult> {
		await saveBoxEndpoint({
			host: payload.host,
			port: payload.port,
			deviceId: payload.deviceId
		});

		await this.requestJoinPermission();

		return this.driver.connect({
			ssid: payload.ssid,
			password: payload.password,
			security: payload.security
		});
	}

	/**
	 * Decode-then-join in one call. Callers that need the decoded payload even
	 * when the join fails should use {@link parseCleverBoxQr} and {@link join}
	 * separately instead.
	 */
	async pairFromQr(raw: string): Promise<PairFromQrResult> {
		const payload = parseCleverBoxQr(raw);
		const connection = await this.join(payload);
		return {payload, connection};
	}
}

export const hotspotService = new HotspotService();
