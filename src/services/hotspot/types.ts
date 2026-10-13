/**
 * Types for the QR-code box pairing flow.
 *
 * A CleverBox exposes a provisioning access point and carries a QR code holding
 * everything needed to join it and reach the box behind it.
 */

export type WifiSecurity = 'WPA3' | 'WPA2' | 'WPA' | 'WEP' | 'OPEN';

/** Decoded and validated content of a CleverBox QR code. */
export interface CleverBoxQrPayload {
	type: 'cleverbox';
	ssid: string;
	password: string;
	security: WifiSecurity;
	/**
	 * mDNS hostname of the box, always `.local`-suffixed and lowercased by
	 * `parseCleverBoxQr`. Never an IP address: the box certificate is issued for
	 * `DNS:<hostname>.local`, so connecting by address would lose hostname
	 * verification.
	 */
	host: string;
	port: number;
	deviceId: string;
}

export type HotspotErrorCode =
	/** The QR code is not a CleverBox payload, or is malformed. */
	| 'INVALID_QR'
	/** Camera or location permission was refused. */
	| 'PERMISSION_DENIED'
	/** The system did not join the network within the allotted time. */
	| 'TIMEOUT'
	/** The user dismissed the system "join this network?" dialog. */
	| 'USER_CANCELLED'
	/** The platform cannot join a network programmatically at all. */
	| 'UNSUPPORTED'
	/** Android < 33 requires location services to be *on*, not just granted. */
	| 'LOCATION_DISABLED'
	/** iOS: the native NEHotspotConfiguration module is not written yet. */
	| 'NOT_IMPLEMENTED'
	/** Anything the native side reported that does not map to the above. */
	| 'UNKNOWN';

export class HotspotError extends Error {
	readonly code: HotspotErrorCode;

	constructor(code: HotspotErrorCode, message: string) {
		super(message);
		this.name = 'HotspotError';
		this.code = code;
		// Required when targeting ES5 so `instanceof` keeps working.
		Object.setPrototypeOf(this, HotspotError.prototype);
	}
}

export interface HotspotConnectConfig {
	ssid: string;
	password: string;
	security: WifiSecurity;
	timeoutMs?: number;
}

export interface HotspotConnectResult {
	ssid: string;
	/**
	 * `bound` — the app's traffic was pinned to the hotspot (Android).
	 * `system` — the device joined it as its default network (iOS, legacy Android).
	 */
	binding: 'bound' | 'system';
}

/**
 * Platform-agnostic contract behind {@link HotspotService}. Implemented by the
 * native driver (Android), the stub (iOS, not written yet) and the mock.
 */
export interface HotspotDriver {
	readonly name: string;
	isSupported(): Promise<boolean>;
	connect(config: HotspotConnectConfig): Promise<HotspotConnectResult>;
	disconnect(): Promise<void>;
	getCurrentSsid(): Promise<string | null>;
}

/** Box endpoint persisted after a successful scan. */
export interface BoxEndpoint {
	host: string;
	port: number;
	deviceId: string;
}
