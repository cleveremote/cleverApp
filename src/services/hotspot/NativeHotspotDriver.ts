import {NativeModules, Platform} from 'react-native';
import {
	HotspotConnectConfig,
	HotspotConnectResult,
	HotspotDriver,
	HotspotError,
	HotspotErrorCode
} from './types';

const {HotspotModule} = NativeModules;

const DEFAULT_TIMEOUT_MS = 30000;

/** Native reject codes → the platform-agnostic error codes the screen renders. */
const NATIVE_CODE_MAP: Record<string, HotspotErrorCode> = {
	E_HOTSPOT_TIMEOUT: 'TIMEOUT',
	E_HOTSPOT_CANCELLED: 'USER_CANCELLED',
	E_HOTSPOT_UNSUPPORTED: 'UNSUPPORTED',
	E_HOTSPOT_PERMISSION: 'PERMISSION_DENIED',
	E_HOTSPOT_LOCATION_DISABLED: 'LOCATION_DISABLED'
};

function toHotspotError(error: any): HotspotError {
	if (error instanceof HotspotError) return error;
	const code = NATIVE_CODE_MAP[error?.code] ?? 'UNKNOWN';
	return new HotspotError(code, error?.message ?? 'Échec de la connexion au hotspot.');
}

/**
 * Talks to the Android `HotspotModule`. Mirrors the shim style of
 * `src/services/socket/SSLConfig.ts`: fail loudly and early if the native side
 * is missing rather than throwing an opaque "undefined is not a function".
 */
export class NativeHotspotDriver implements HotspotDriver {
	readonly name = 'native';

	private assertAvailable(): void {
		if (!HotspotModule) {
			throw new HotspotError(
				'UNSUPPORTED',
				`HotspotModule is not available on ${Platform.OS}. ` +
					'Ensure the native module is properly linked.'
			);
		}
	}

	async isSupported(): Promise<boolean> {
		if (!HotspotModule) return false;
		try {
			return await HotspotModule.isSupported();
		} catch {
			return false;
		}
	}

	async connect(config: HotspotConnectConfig): Promise<HotspotConnectResult> {
		this.assertAvailable();
		try {
			return await HotspotModule.connect({
				ssid: config.ssid,
				password: config.password,
				security: config.security,
				timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS
			});
		} catch (error) {
			throw toHotspotError(error);
		}
	}

	async disconnect(): Promise<void> {
		if (!HotspotModule) return;
		try {
			await HotspotModule.disconnect();
		} catch {
			// Releasing the network is best-effort: the app must not get stuck on
			// a teardown failure.
		}
	}

	async getCurrentSsid(): Promise<string | null> {
		if (!HotspotModule) return null;
		try {
			return await HotspotModule.getCurrentSsid();
		} catch {
			return null;
		}
	}
}
