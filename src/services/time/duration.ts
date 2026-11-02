/**
 * Durées (délai, décalage, durée max…) saisies avec un sélecteur d'heure :
 * « 01:30 » vaut 1 h 30, pas une heure de la journée. Construites avec
 * `setHours` plutôt que `minuit + ms`, qui se décale d'une heure les jours de
 * changement d'heure.
 */
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

/** Durée en ms -> Date du jour à l'heure murale équivalente (pour le picker). */
export const durationToPickerDate = (ms?: number | null): Date => {
	const total = Math.max(0, Math.round((Number(ms) || 0) / MINUTE));
	// Jour fixe, sans changement d'heure : « 02:30 » ne peut pas tomber dans
	// le trou d'un passage à l'heure d'été.
	return new Date(2000, 0, 3, Math.floor(total / 60) % 24, total % 60, 0, 0);
};

/** Date du picker -> durée en ms (heures et minutes uniquement). */
export const pickerDateToDuration = (date: Date): number =>
	date.getHours() * HOUR + date.getMinutes() * MINUTE;
