import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState, I18nManager} from 'react-native';
import * as RNLocalize from 'react-native-localize';
import RNRestart from 'react-native-restart';
import i18n from 'i18next';
import {
	DEFAULT_LANGUAGE,
	Language,
	RTL_LANGUAGES,
	SUPPORTED_LANGUAGES
} from './resources';

const STORAGE_KEY = 'language';

/** 'system' = suivre la langue de l'appareil. */
export type LanguagePreference = Language | 'system';

const isSupported = (value: string | null): value is Language =>
	!!value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

const deviceLanguage = (): Language => {
	const best = RNLocalize.findBestLanguageTag([...SUPPORTED_LANGUAGES]);
	return (best?.languageTag as Language) ?? DEFAULT_LANGUAGE;
};

export const isRTL = (lng: Language) => RTL_LANGUAGES.includes(lng);

export async function getLanguagePreference(): Promise<LanguagePreference> {
	try {
		const stored = await AsyncStorage.getItem(STORAGE_KEY);
		return isSupported(stored) ? stored : 'system';
	} catch {
		return 'system';
	}
}

const resolve = (pref: LanguagePreference): Language =>
	pref === 'system' ? deviceLanguage() : pref;

/** Langue effective d'une préférence ('system' -> langue de l'appareil). */
export const resolveLanguage = resolve;

/**
 * Aligne le sens de l'interface sur la langue. RN ne l'applique qu'au
 * démarrage : renvoie true quand un redémarrage est nécessaire.
 */
function syncDirection(lng: Language): boolean {
	const rtl = isRTL(lng);
	I18nManager.allowRTL(rtl);
	if (I18nManager.isRTL === rtl) {
		return false;
	}
	I18nManager.forceRTL(rtl);
	return true;
}

let deviceSubscription: {remove: () => void} | undefined;

// react-native-localize n'émet plus d'événement : la langue système ne
// pouvant changer qu'app en arrière-plan, on la relit au retour au premier plan.
function followDeviceLanguage(pref: LanguagePreference) {
	deviceSubscription?.remove();
	deviceSubscription = undefined;
	if (pref !== 'system') {
		return;
	}
	deviceSubscription = AppState.addEventListener('change', state => {
		if (state === 'active' && deviceLanguage() !== i18n.language) {
			applyLanguage(deviceLanguage());
		}
	});
}

async function applyLanguage(lng: Language) {
	await i18n.changeLanguage(lng);
	if (syncDirection(lng)) {
		RNRestart.restart();
	}
}

/** À appeler au démarrage (pendant le splash). */
export async function initLanguage() {
	const pref = await getLanguagePreference();
	followDeviceLanguage(pref);
	await applyLanguage(resolve(pref));
}

/**
 * Change et mémorise la langue. Si le sens d'écriture change (ar <-> fr/en),
 * l'app redémarre : l'appelant doit avoir prévenu l'utilisateur
 * (voir `needsRestart`).
 */
export async function changeLanguage(pref: LanguagePreference) {
	try {
		if (pref === 'system') {
			await AsyncStorage.removeItem(STORAGE_KEY);
		} else {
			await AsyncStorage.setItem(STORAGE_KEY, pref);
		}
	} catch {
		// La langue s'applique quand même pour la session en cours.
	}
	followDeviceLanguage(pref);
	await applyLanguage(resolve(pref));
}

/** true si passer à `pref` imposera un redémarrage de l'app. */
export const needsRestart = (pref: LanguagePreference) =>
	isRTL(resolve(pref)) !== I18nManager.isRTL;

/** Langue active, à transmettre au box pour qu'il renvoie ses textes traduits. */
export const currentLanguage = (): Language =>
	isSupported(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
