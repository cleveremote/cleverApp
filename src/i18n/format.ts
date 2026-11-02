// Formatage dépendant de la langue courante. Remplace les locales codées en
// dur ('fr-FR', 'en') : toujours passer par ces helpers.
import i18n from 'i18next';

// Chiffres latins même en arabe : valeurs techniques (pH, EC, durées)
// lues à côté de saisies en chiffres latins.
const locale = () => `${i18n.language}-u-nu-latn`;

export const formatTime = (
	date: Date,
	options: Intl.DateTimeFormatOptions = {hour: '2-digit', minute: '2-digit'}
) => new Intl.DateTimeFormat(locale(), options).format(date);

export const formatDate = (
	date: Date,
	options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}
) => new Intl.DateTimeFormat(locale(), options).format(date);

export const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
	new Intl.NumberFormat(locale(), options).format(value);

/**
 * Noms courts des jours, dimanche en premier (ordre du champ « jour de la
 * semaine » cron : 0 = dimanche).
 */
export const weekdayNames = (format: 'short' | 'long' = 'short') => {
	const fmt = new Intl.DateTimeFormat(locale(), {weekday: format});
	// 2023-01-01 est un dimanche.
	return Array.from({length: 7}, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
};

/** Noms des mois, janvier en premier. */
export const monthNames = (format: 'short' | 'long' = 'short') => {
	const fmt = new Intl.DateTimeFormat(locale(), {month: format});
	return Array.from({length: 12}, (_, i) => fmt.format(new Date(2023, i, 1)));
};
