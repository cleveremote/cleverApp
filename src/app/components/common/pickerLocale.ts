import i18n from 'i18next';

// Locale du picker natif pour les dates : langue de l'app, en 24 h comme les
// affichages (Intl hourCycle h23) — 'en' seul passerait en AM/PM.
const DATE_LOCALES: Record<string, string> = {en: 'en-GB', fr: 'fr-FR', ar: 'ar'};

/**
 * Props de traduction pour react-native-modal-datetime-picker : libellés des
 * boutons (iOS et Android) et, en mode date, langue du calendrier (iOS ; sur
 * Android le dialogue suit la langue du système). Les roues de durée (mode
 * 'time') gardent la locale du téléphone pour ne pas basculer en AM/PM.
 */
export const pickerLocaleProps = (mode: 'date' | 'time' | 'datetime') => {
	const confirm = i18n.t('common:confirmChoice');
	const cancel = i18n.t('common:cancel');
	return {
		confirmTextIOS: confirm,
		cancelTextIOS: cancel,
		positiveButton: {label: confirm},
		negativeButton: {label: cancel},
		...(mode !== 'time' && {
			locale: DATE_LOCALES[i18n.language] ?? i18n.language
		})
	};
};
