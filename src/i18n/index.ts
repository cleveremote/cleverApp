import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {
	DEFAULT_LANGUAGE,
	defaultNS,
	namespaces,
	resources,
	SUPPORTED_LANGUAGES
} from './resources';

// Init synchrone (ressources embarquées) en langue par défaut : les textes
// sont disponibles dès le premier rendu. La vraie langue (choix enregistré ou
// langue de l'appareil) est appliquée ensuite par `initLanguage()`, pendant
// le splash.
i18n.use(initReactI18next).init({
	resources,
	lng: DEFAULT_LANGUAGE,
	fallbackLng: DEFAULT_LANGUAGE,
	supportedLngs: [...SUPPORTED_LANGUAGES],
	ns: namespaces,
	defaultNS,
	initAsync: false,
	interpolation: {escapeValue: false},
	returnNull: false,
	showSupportNotice: false
});

export default i18n;
export * from './resources';
export {
	changeLanguage,
	getLanguagePreference,
	initLanguage,
	needsRestart,
	resolveLanguage
} from './language';
export type {LanguagePreference} from './language';

/**
 * Libellé d'une valeur venant de la box (enum, mode…) : `prefix.value` si la
 * clé existe, sinon la valeur brute. Pour les clés construites à l'exécution,
 * que le typage strict des clés ne peut pas vérifier.
 */
export const valueLabel = (prefix: string, value: string): string =>
	i18n.t(`${prefix}.${value}` as never, {defaultValue: value}) as string;
export {directionalIcon} from './rtl';
