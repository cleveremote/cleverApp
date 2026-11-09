import AsyncStorage from '@react-native-async-storage/async-storage';
import {BoxEndpoint} from './types';

const STORAGE_KEY = 'boxEndpoint';

/**
 * Le `deviceId` du QR porte parfois `.local` ; l'account du profil (qui sert
 * de `boxId`) ne le porte jamais. Les deux doivent tomber sur la même clé.
 */
const normalizeDeviceId = (deviceId: string) =>
	deviceId.trim().replace(/\.local$/i, '').toLowerCase();

const storageKey = (deviceId: string) =>
	`${STORAGE_KEY}:${normalizeDeviceId(deviceId)}`;

const isValidEndpoint = (parsed: any): parsed is BoxEndpoint =>
	typeof parsed?.host === 'string' &&
	parsed.host !== '' &&
	typeof parsed?.port === 'number';

const parseEndpoint = (stored: string | null): BoxEndpoint | null => {
	if (!stored) return null;
	try {
		const parsed = JSON.parse(stored);
		// Guard against a stale or half-written entry: falling back to mDNS is
		// always better than building an `https://undefined:NaN` URL.
		return isValidEndpoint(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

/**
 * Endpoint scanned from a QR code, persisted per box (`deviceId`) so
 * `auth.service` can point the socket at the right box without going through
 * mDNS service discovery.
 */
export async function saveBoxEndpoint(endpoint: BoxEndpoint): Promise<void> {
	if (!endpoint.deviceId) return;
	await AsyncStorage.setItem(
		storageKey(endpoint.deviceId),
		JSON.stringify(endpoint)
	);
}

export async function getBoxEndpoint(
	deviceId: string | undefined
): Promise<BoxEndpoint | null> {
	if (!deviceId || !normalizeDeviceId(deviceId)) return null;
	const endpoint = parseEndpoint(
		await AsyncStorage.getItem(storageKey(deviceId))
	);
	if (endpoint) return endpoint;

	// Avant l'indexation par box, un seul endpoint était gardé sous
	// `boxEndpoint` : repris s'il appartient à cette box, puis migré.
	const legacy = parseEndpoint(await AsyncStorage.getItem(STORAGE_KEY));
	if (
		legacy?.deviceId &&
		normalizeDeviceId(legacy.deviceId) === normalizeDeviceId(deviceId)
	) {
		await saveBoxEndpoint(legacy);
		await AsyncStorage.removeItem(STORAGE_KEY);
		return legacy;
	}
	return null;
}

export async function clearBoxEndpoint(
	deviceId: string | undefined
): Promise<void> {
	if (!deviceId || !normalizeDeviceId(deviceId)) return;
	await AsyncStorage.removeItem(storageKey(deviceId));
	const legacy = parseEndpoint(await AsyncStorage.getItem(STORAGE_KEY));
	if (
		legacy?.deviceId &&
		normalizeDeviceId(legacy.deviceId) === normalizeDeviceId(deviceId)
	) {
		await AsyncStorage.removeItem(STORAGE_KEY);
	}
}
