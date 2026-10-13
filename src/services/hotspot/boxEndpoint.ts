import AsyncStorage from '@react-native-async-storage/async-storage';
import {BoxEndpoint} from './types';

const STORAGE_KEY = 'boxEndpoint';

/**
 * Endpoint scanned from a QR code, persisted so `auth.service` can point the
 * socket at the box without going through mDNS service discovery.
 */
export async function saveBoxEndpoint(endpoint: BoxEndpoint): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(endpoint));
}

export async function getBoxEndpoint(): Promise<BoxEndpoint | null> {
	const stored = await AsyncStorage.getItem(STORAGE_KEY);
	if (!stored) return null;
	try {
		const parsed = JSON.parse(stored);
		// Guard against a stale or half-written entry: falling back to mDNS is
		// always better than building an `https://undefined:NaN` URL.
		if (
			typeof parsed?.host === 'string' &&
			parsed.host !== '' &&
			typeof parsed?.port === 'number'
		) {
			return parsed as BoxEndpoint;
		}
		return null;
	} catch {
		return null;
	}
}

export async function clearBoxEndpoint(): Promise<void> {
	await AsyncStorage.removeItem(STORAGE_KEY);
}
