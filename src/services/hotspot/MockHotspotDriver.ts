import {
	HotspotConnectConfig,
	HotspotConnectResult,
	HotspotDriver,
	HotspotError
} from './types';

export type MockBehavior = 'success' | 'timeout' | 'denied' | 'cancelled';

const CONNECT_DELAY_MS = 1500;

/**
 * Simulated driver, so the pairing screen can be exercised without a box — on a
 * simulator, or on a device with no CleverBox in range. Enabled by the
 * HOTSPOT_MOCK flag in config/websocket.ts.
 */
export class MockHotspotDriver implements HotspotDriver {
	readonly name = 'mock';

	private behavior: MockBehavior = 'success';
	private currentSsid: string | null = null;

	/** Drives the failure branches from the screen or a dev console. */
	setBehavior(behavior: MockBehavior): void {
		this.behavior = behavior;
	}

	async isSupported(): Promise<boolean> {
		return true;
	}

	async connect(config: HotspotConnectConfig): Promise<HotspotConnectResult> {
		await new Promise<void>(resolve => {
			setTimeout(() => resolve(), CONNECT_DELAY_MS);
		});

		switch (this.behavior) {
			case 'timeout':
				throw new HotspotError(
					'TIMEOUT',
					`[mock] Impossible de rejoindre "${config.ssid}" dans le temps imparti.`
				);
			case 'denied':
				throw new HotspotError(
					'PERMISSION_DENIED',
					'[mock] Permission refusée.'
				);
			case 'cancelled':
				throw new HotspotError(
					'USER_CANCELLED',
					'[mock] Connexion annulée par l’utilisateur.'
				);
			default:
				this.currentSsid = config.ssid;
				return {ssid: config.ssid, binding: 'bound'};
		}
	}

	async disconnect(): Promise<void> {
		this.currentSsid = null;
	}

	async getCurrentSsid(): Promise<string | null> {
		return this.currentSsid;
	}
}
