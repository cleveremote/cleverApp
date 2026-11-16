import AsyncStorage from '@react-native-async-storage/async-storage';
import {Alert, Platform} from 'react-native';
import * as Keychain from 'react-native-keychain';
import i18n from 'i18next';
import {clearBoxEndpoint} from '../../../services/hotspot/boxEndpoint';

// Face ID / Touch ID, avec repli sur le code du téléphone : sans biométrie
// enrôlée (ou refusée à l'app), le code suffit au lieu de bloquer l'accès.
const CREDENTIALS_ACCESS = {
	accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
	accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY
};

// Les éléments rangés avant ce réglage restent lisibles ; on les réécrit une
// fois avec les nouveaux attributs.
const migratedKey = (account: string) => `keychainV2:${account}`;

const isCancellation = (error: unknown) =>
	/cancel|annul/i.test(String((error as Error)?.message ?? error));

/**
 * `account` identifie la box (son nom, qui sert aussi de `boxId`) et `login`
 * est l'identifiant du compte sur cette box. Les deux se confondaient tant que
 * l'appairage BLE ne demandait pas d'identifiant ; la configuration par hotspot
 * les distingue, d'où le trousseau indexé sur l'account et l'username qui porte
 * le vrai login.
 */
const setCredentials = async (
	account: string,
	login: string,
	password: string
): Promise<boolean> => {
	try {
		// Sans code de verrouillage, iOS refuse l'élément protégé : on le dit
		// plutôt que de garder le mot de passe sans protection.
		if (
			Platform.OS === 'ios' &&
			!(await Keychain.canImplyAuthentication({
				authenticationType:
					Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS
			}))
		) {
			Alert.alert(i18n.t('access:signIn.noPasscode'));
			return false;
		}
		await Keychain.setGenericPassword(login, password, {
			...CREDENTIALS_ACCESS,
			service: account
		});
		await AsyncStorage.multiSet([
			['boxId', account],
			[migratedKey(account), '1']
		]);
		return true;
	} catch (error) {
		console.error('Error storing credentials for remember me:', error);
		Alert.alert(i18n.t('access:signIn.credentialsNotSaved'));
		return false;
	}
};

type CredentialsResult =
	| {credentials: Keychain.UserCredentials | null; error?: undefined}
	| {credentials: null; error: 'cancelled' | 'unavailable'};

const readCredentials = async (account: string): Promise<CredentialsResult> => {
	try {
		const credentials = await Keychain.getGenericPassword({
			...CREDENTIALS_ACCESS,
			service: account,
			authenticationPrompt: {
				title: i18n.t('access:signIn.unlockPrompt'),
				cancel: i18n.t('common:cancel')
			}
		});
		if (!credentials) {
			return {credentials: null};
		}
		if (!(await AsyncStorage.getItem(migratedKey(account)))) {
			await setCredentials(account, credentials.username, credentials.password);
		}
		return {credentials};
	} catch (error) {
		console.error("Keychain couldn't be accessed!", error);
		return {
			credentials: null,
			error: isCancellation(error) ? 'cancelled' : 'unavailable'
		};
	}
};

const getCredentials = async (
	account: string
): Promise<Keychain.UserCredentials | null> =>
	(await readCredentials(account)).credentials;

const clearCredentials = async (account: string) => {
	try {
		await Keychain.resetGenericPassword({service: account});
		await AsyncStorage.removeItem(migratedKey(account));
	} catch (error) {
		console.error('error resetGenericPassword', error);
	}
};

const setAssociationProfileAccount = async (
	profile: string,
	account: string,
	rememberCredentials: boolean,
	login?: string
) => {
	try {
		// Le login est gardé avec le profil, hors du trousseau : il reste
		// affiché (en lecture seule) même si le déverrouillage est refusé.
		await AsyncStorage.setItem(
			profile,
			JSON.stringify({account, rememberCredentials, login})
		);
	} catch (error) {
		console.error('Error setAssociationProfileAccount:', error);
	}
};

const getAssociationProfileAccount = async (
	profile: string
): Promise<{
	account: string;
	rememberCredentials: boolean;
	login?: string;
} | null> => {
	try {
		const data = await AsyncStorage.getItem(profile);
		if (data) {
			return JSON.parse(data);
		}
	} catch (error) {
		console.error('Error getAssociationProfileAccount:', error);
	}
	return null;
};

const setIsRememberCredentials = async (value: boolean, account: string) => {
	try {
		if (!value) {
			await clearCredentials(account);
		}
		await AsyncStorage.setItem('checkStatus', value.toString());
	} catch (error) {
		console.error('Error setIsRememberCredentials:', error);
	}
};

const getIsRememberCredentials = async () => {
	try {
		return Boolean(await AsyncStorage.getItem('checkStatus'));
	} catch (error) {
		console.error('Error getIsRememberCredentials:', error);
		return false;
	}
};

const setProfiles = async (profile: string) => {
	try {
		const profilesStr = await AsyncStorage.getItem('profiles');
		const profiles = profilesStr?.split(',') || [];
		profiles.push(profile);
		await AsyncStorage.setItem('profiles', profiles.join(','));
	} catch (error) {
		console.error('Error getAssociationProfileAccount:', error);
	}
	return null;
};

const getAllProfiles = async () => {
	try {
		const profilesStr = await AsyncStorage.getItem('profiles');
		// const profilesStr = 'My test box, My test box bis';
		return profilesStr?.split(',') || [];
	} catch (error) {
		console.error('Error getAssociationProfileAccount:', error);
		return [];
	}
};

const getSigninData = async (profile: string) => {
	try {
		const data = await getAssociationProfileAccount(profile);
		if (data) {
			const {credentials, error} = await readCredentials(data.account);
			return {
				login: credentials?.username || data.login || '',
				// Nom de la box : distinct du login depuis que la configuration
				// par hotspot demande une adresse email.
				account: data.account,
				password: credentials?.password || '',
				rememberCredentials: data.rememberCredentials,
				profile,
				credentialsError: error
			};
		}
	} catch (error) {
		console.error('Error getAssociationProfileAccount:', error);
	}
	return null;
};

/**
 * Profil (autre que `exceptProfile`) qui utilise déjà ce login, s'il y en a
 * un : un login ne peut appartenir qu'à un seul profil. Lu sans le trousseau
 * (pas de déverrouillage) ; les profils sans login gardé retombent sur
 * l'account, qui le portait avant.
 */
const findProfileByLogin = async (
	login: string,
	exceptProfile?: string
): Promise<string | undefined> => {
	const wanted = login.trim().toLowerCase();
	if (!wanted) return undefined;
	for (const profile of await getAllProfiles()) {
		if (!profile || profile === exceptProfile) continue;
		const data = await getAssociationProfileAccount(profile);
		const used = (data?.login || data?.account || '').trim().toLowerCase();
		if (used === wanted) return profile;
	}
	return undefined;
};

const removeProfileEntry = async (profile: string) => {
	//remove assocition profile acount.
	await AsyncStorage.removeItem(profile);
	//remove profile from profiles list
	const profilesLst = await getAllProfiles();
	const index = profilesLst.findIndex(x => x === profile);
	if (index >= 0) profilesLst.splice(index, 1);
	await AsyncStorage.setItem('profiles', profilesLst.join(','));
};

/**
 * Supprime le profil, ses identifiants mémorisés et l'endpoint de sa box :
 * l'account est le `deviceId` du QR scanné, sous lequel `saveBoxEndpoint`
 * (et le trousseau) l'ont rangé.
 */
const deleteProfile = async (profile: string) => {
	const data = await getAssociationProfileAccount(profile);
	await removeProfileEntry(profile);
	if (data?.account) {
		await clearCredentials(data.account);
		try {
			await clearBoxEndpoint(data.account);
		} catch (error) {
			console.error('Error clearBoxEndpoint:', error);
		}
	}
};

const saveSigninData = async (
	newProfile: string,
	account: string,
	login: string,
	password: string,
	rememberCredentials: boolean,
	profile: string
): Promise<void> => {
	// Appelé une fois l'authentification réussie : « se souvenir de moi » coché
	// enregistre (ou renomme) le profil avec son login et son mot de passe.
	if (rememberCredentials) {
		// Renommage : l'endpoint de la box reste, seul le profil est remplacé.
		if (profile) {
			await removeProfileEntry(profile);
		}
		await setProfiles(newProfile);
		await setAssociationProfileAccount(
			newProfile,
			account,
			rememberCredentials,
			login
		);
		await setCredentials(account, login, password);
		return;
	}
	// Décoché sur un profil existant : le profil et son login restent, seul le
	// mot de passe quitte le trousseau. Sans profil, rien n'est enregistré.
	if (profile) {
		const existing = await getAssociationProfileAccount(profile);
		if (!existing) return;
		await clearCredentials(existing.account);
		if (account && account !== existing.account) {
			await clearCredentials(account);
		}
		await setAssociationProfileAccount(
			profile,
			existing.account,
			false,
			existing.login || login
		);
	}
};

/**
 * Mot de passe changé hors de l'écran de connexion (« mot de passe oublié ») :
 * le profil qui retient ce login avec « se souvenir de moi » garde sinon
 * l'ancien, et le proposerait à la prochaine connexion. Un profil qui ne
 * retient pas ses identifiants n'a rien à mettre à jour.
 */
const updateRememberedPassword = async (
	login: string,
	password: string
): Promise<void> => {
	const profile = await findProfileByLogin(login);
	if (!profile) return;
	const data = await getAssociationProfileAccount(profile);
	if (!data?.rememberCredentials) return;
	await setCredentials(data.account, data.login || login, password);
};

export {
	getSigninData,
	clearCredentials,
	getIsRememberCredentials,
	getCredentials,
	setIsRememberCredentials,
	setCredentials,
	setAssociationProfileAccount,
	getAssociationProfileAccount,
	getAllProfiles,
	setProfiles,
	saveSigninData,
	deleteProfile,
	findProfileByLogin,
	updateRememberedPassword
};
