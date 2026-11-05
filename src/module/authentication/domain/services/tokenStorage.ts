import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

/**
 * Jetons de session (accès + rafraîchissement), rangés dans le trousseau
 * iOS / le Keystore Android plutôt que dans AsyncStorage, qui n'est pas
 * chiffré. Pas de contrôle biométrique : ils sont relus à chaque reconnexion
 * du socket, sans l'utilisateur.
 *
 * Gardés aussi en mémoire : le trousseau n'est lisible que téléphone
 * déverrouillé, alors qu'un rafraîchissement peut tomber juste après le
 * verrouillage, dans les secondes où l'app tourne encore.
 */
export type SessionTokens = {accessToken: string; refreshToken: string};

const SERVICE = 'cleverApp.session';
const TOKENS_USERNAME = 'tokens';
// Le trousseau iOS survit à la désinstallation, AsyncStorage non : sans ce
// marqueur, une réinstallation reprendrait l'ancienne session.
const MARKER_KEY = 'sessionInKeychain';
const LEGACY_ACCESS_KEY = 'accessToken';
const LEGACY_REFRESH_KEY = 'refreshToken';

const EMPTY: SessionTokens = {accessToken: '', refreshToken: ''};

let cache: SessionTokens | null = null;

const writeKeychain = async (tokens: SessionTokens) => {
	await Keychain.setGenericPassword(TOKENS_USERNAME, JSON.stringify(tokens), {
		accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
		service: SERVICE
	});
	await AsyncStorage.setItem(MARKER_KEY, '1');
};

// Sessions ouvertes avant le passage au trousseau.
const migrateLegacy = async (): Promise<SessionTokens> => {
	const [[, accessToken], [, refreshToken]] = await AsyncStorage.multiGet([
		LEGACY_ACCESS_KEY,
		LEGACY_REFRESH_KEY
	]);
	const tokens = {
		accessToken: accessToken ?? '',
		refreshToken: refreshToken ?? ''
	};
	if (tokens.accessToken || tokens.refreshToken) {
		await writeKeychain(tokens);
	}
	await AsyncStorage.multiRemove([LEGACY_ACCESS_KEY, LEGACY_REFRESH_KEY]);
	return tokens;
};

const load = async (): Promise<SessionTokens> => {
	if (cache) {
		return cache;
	}
	try {
		if (!(await AsyncStorage.getItem(MARKER_KEY))) {
			await Keychain.resetGenericPassword({service: SERVICE});
			cache = await migrateLegacy();
			return cache;
		}
		const stored = await Keychain.getGenericPassword({service: SERVICE});
		cache = stored ? {...EMPTY, ...JSON.parse(stored.password)} : EMPTY;
		return cache!;
	} catch (error) {
		// Pas de mise en cache : téléphone verrouillé, on retentera.
		console.error('Error reading session tokens:', error);
		return EMPTY;
	}
};

export const getAccessToken = async () => (await load()).accessToken;

export const getRefreshToken = async () => (await load()).refreshToken;

export const saveTokens = async (tokens: SessionTokens) => {
	cache = {accessToken: tokens.accessToken, refreshToken: tokens.refreshToken};
	await writeKeychain(cache);
};

export const clearTokens = async () => {
	cache = EMPTY;
	try {
		await Keychain.resetGenericPassword({service: SERVICE});
		await AsyncStorage.multiRemove([
			MARKER_KEY,
			LEGACY_ACCESS_KEY,
			LEGACY_REFRESH_KEY
		]);
	} catch (error) {
		console.error('Error clearing session tokens:', error);
	}
};
