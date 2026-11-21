import {
	HotspotConnectConfig,
	HotspotConnectResult,
	HotspotDriver,
	HotspotError
} from './types';

/**
 * Placeholder driver for platforms where joining a network programmatically is
 * not implemented yet — today, iOS.
 *
 * The rest of the pairing flow still works: the QR code is scanned, decoded and
 * its endpoint persisted. Only the "join the Wi-Fi for me" step is missing, so
 * `ScanBoxScreen` catches `NOT_IMPLEMENTED` and walks the user through joining
 * the hotspot from the system settings instead of showing a failure.
 *
 * TODO(ios): back this with a native NEHotspotConfiguration module.
 *   - `ios/cleverApp/HotspotModule.h/.m` in ObjC (the project has no Swift
 *     bridging header), modelled on SSLCAModule.m.
 *   - `NEHotspotConfiguration initWithSSID:passphrase:isWEP:NO` (or
 *     `initWithSSID:` when security is OPEN), `joinOnce = YES` so the
 *     provisioning AP is forgotten when the app closes, then
 *     `[NEHotspotConfigurationManager.sharedManager applyConfiguration:...]`.
 *   - Treat `NEHotspotConfigurationErrorAlreadyAssociated` as success, and
 *     confirm the SSID actually joined with
 *     `[NEHotspotNetwork fetchCurrentWithCompletionHandler:]` — applying a
 *     configuration can succeed without the join completing.
 *   - Add `HotspotModule.m` to the Compile Sources phase, and the entitlement
 *     `com.apple.developer.networking.HotspotConfiguration` to both
 *     cleverApp.entitlements and cleverAppDebug.entitlements (plus enable
 *     Hotspot Configuration on the App ID and regenerate the profiles).
 *   - Then drop this driver from HotspotService's selection.
 * No TLS work is needed for that follow-up: the URL stays on the `.local`
 * hostname, so iOS verification is unchanged.
 */
export class StubHotspotDriver implements HotspotDriver {
	readonly name = 'stub';

	async isSupported(): Promise<boolean> {
		return false;
	}

	async connect(_config: HotspotConnectConfig): Promise<HotspotConnectResult> {
		throw new HotspotError(
			'NOT_IMPLEMENTED',
			"La connexion automatique au hotspot n'est pas encore disponible sur cette plateforme."
		);
	}

	async disconnect(): Promise<void> {
		// Nothing was ever joined by us.
	}

	async getCurrentSsid(): Promise<string | null> {
		return null;
	}
}
