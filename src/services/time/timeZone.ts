/**
 * Fuseau horaire de la box : un identifiant IANA (« Africa/Casablanca »)
 * que la box déduit elle-même de ses coordonnées GPS, renvoyé dans ses
 * settings, et appliqué par la box à tous ses crons. Les expressions cron
 * sont donc écrites en heure locale de la box, pas en heure du téléphone.
 */

/** Fuseau du téléphone ; 'UTC' si le moteur JS ne sait pas le donner. */
export const deviceTimeZone = (): string => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	} catch {
		return 'UTC';
	}
};

export type WallClock = {
	year: number;
	month: number; // 1-12
	day: number;
	hour: number;
	minute: number;
	second: number;
	weekday: number; // 0 = dimanche, comme le champ cron
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatterFor = (timeZone: string) => {
	let fmt = formatters.get(timeZone);
	if (!fmt) {
		fmt = new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			weekday: 'short',
			hourCycle: 'h23'
		});
		formatters.set(timeZone, fmt);
	}
	return fmt;
};

/** Heure murale d'un instant dans un fuseau donné. */
export const wallClockIn = (timeZone: string, date: Date | number): WallClock => {
	const parts: Record<string, string> = {};
	for (const p of formatterFor(timeZone).formatToParts(new Date(date))) {
		parts[p.type] = p.value;
	}
	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		// Certains moteurs rendent « 24 » pour minuit malgré h23.
		hour: Number(parts.hour) % 24,
		minute: Number(parts.minute),
		second: Number(parts.second),
		weekday: WEEKDAYS.indexOf(parts.weekday)
	};
};

/**
 * Instant (epoch ms) correspondant à une heure murale dans un fuseau donné.
 * Heure inexistante (saut d'été) : décalée après le saut, comme le ferait une
 * horloge.
 */
export const zonedToEpoch = (
	timeZone: string,
	wall: Pick<WallClock, 'year' | 'month' | 'day' | 'hour' | 'minute'> & {
		second?: number;
	}
): number => {
	const asUtc = Date.UTC(
		wall.year,
		wall.month - 1,
		wall.day,
		wall.hour,
		wall.minute,
		wall.second ?? 0
	);
	const offsetAt = (t: number) => {
		const w = wallClockIn(timeZone, t);
		return (
			Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) -
			Math.floor(t / 1000) * 1000
		);
	};
	// Deux passes : la seconde corrige un décalage qui change entre l'heure
	// estimée et l'heure réelle (jour de changement d'heure).
	let t = asUtc - offsetAt(asUtc);
	t = asUtc - offsetAt(t);
	return t;
};

/**
 * Les pickers natifs affichent et rendent une heure du téléphone. Pour saisir
 * une heure d'un autre fuseau, on leur présente une Date dont l'heure locale
 * est l'heure murale voulue…
 */
export const toPickerDate = (timeZone: string, date: Date | number): Date => {
	const w = wallClockIn(timeZone, date);
	return new Date(w.year, w.month - 1, w.day, w.hour, w.minute);
};

/** …et on réinterprète leur résultat dans ce fuseau (epoch ms). */
export const fromPickerDate = (timeZone: string, d: Date): number =>
	zonedToEpoch(timeZone, {
		year: d.getFullYear(),
		month: d.getMonth() + 1,
		day: d.getDate(),
		hour: d.getHours(),
		minute: d.getMinutes()
	});

/** Minuit du jour courant dans un fuseau (epoch ms). */
export const startOfDayIn = (timeZone: string, date: Date | number = Date.now()): number =>
	zonedToEpoch(timeZone, {...wallClockIn(timeZone, date), hour: 0, minute: 0, second: 0});

/** Dernière milliseconde du jour courant dans un fuseau (epoch ms). */
export const endOfDayIn = (timeZone: string, date: Date | number = Date.now()): number =>
	zonedToEpoch(timeZone, {...wallClockIn(timeZone, date), hour: 23, minute: 59, second: 59}) + 999;
