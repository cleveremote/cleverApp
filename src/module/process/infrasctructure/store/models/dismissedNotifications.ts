import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bandeaux « conditions non vérifiées » ignorés par l'utilisateur, par
 * cycle / séquence. Le refus reste dans le `lastEvent` du box : sans cette
 * mémoire, chaque fetch le réaffichait. Un refus est considéré comme déjà
 * traité s'il porte le même `runId`, s'il date d'avant (ou du moment de)
 * l'ignore, ou, sans run ni date, s'il a le même texte ; un refus plus récent
 * s'affiche à nouveau.
 * Sauvegardé dans AsyncStorage pour survivre à un redémarrage.
 */

type Dismissal = {upTo: number; runId?: string; message?: string};

const STORAGE_KEY = 'dismissedNotifications';
const CONDITIONS_NOT_VERIFIED = 'CONDITIONS_NOT_VERIFIED';
// Au-delà, les plus anciens sont oubliés (simple garde-fou de taille).
const MAX_ENTRIES = 200;

let dismissals: Record<string, Dismissal> = {};

// Lecture du stockage au démarrage. Les ignores faits avant sa fin priment
// sur les valeurs lues ; les écritures attendent cette lecture, sinon elles
// écraseraient le stockage avec une liste encore vide.
const loaded = AsyncStorage.getItem(STORAGE_KEY)
	.then(raw => {
		if (raw) dismissals = {...JSON.parse(raw), ...dismissals};
	})
	.catch(() => undefined);

const save = () =>
	loaded.then(() => {
		const kept = Object.entries(dismissals)
			.sort(([, a], [, b]) => b.upTo - a.upTo)
			.slice(0, MAX_ENTRIES);
		dismissals = Object.fromEntries(kept);
		return AsyncStorage.setItem(
			STORAGE_KEY,
			JSON.stringify(dismissals)
		).catch(() => undefined);
	});

/**
 * Oublie les ignores des cycles / séquences qui n'existent plus. Appelé avec
 * la liste complète des ids à chaque chargement de la configuration.
 */
export const pruneDismissedNotifications = (existingIds: string[]) =>
	loaded.then(() => {
		const existing = new Set(existingIds.map(id => `${id}`));
		const stale = Object.keys(dismissals).filter(id => !existing.has(id));
		if (!stale.length) return;
		stale.forEach(id => delete dismissals[id]);
		return save();
	});

const eventTime = (entry: any) => {
	const time = entry?.eventDate ? new Date(entry.eventDate).getTime() : NaN;
	return Number.isNaN(time) ? undefined : time;
};

export const dismissNotification = (entry: any) => {
	if (!entry?.id) return;
	dismissals[entry.id] = {
		// Date du refus quand elle est connue (horloge du box, comparée aux
		// prochains `lastEvent`), sinon maintenant.
		upTo: eventTime(entry) ?? Date.now(),
		runId: entry.runId,
		message: entry.message
	};
	save();
};

export const isNotificationDismissed = (entry: any): boolean => {
	const dismissal = entry?.id ? dismissals[entry.id] : undefined;
	if (!dismissal || entry.notification !== CONDITIONS_NOT_VERIFIED) {
		return false;
	}
	if (entry.runId && entry.runId === dismissal.runId) return true;
	const time = eventTime(entry);
	if (time !== undefined) return time <= dismissal.upTo;
	// Ni run ni date (payload WebSocket) : même texte = même refus. Un refus
	// identique mais daté plus tard (nouveau run) reste affiché.
	return !entry.runId && !!entry.message && entry.message === dismissal.message;
};

// Retire d'une entrée de status la notification déjà ignorée.
export const withoutDismissedNotification = (entry: any) => {
	if (!isNotificationDismissed(entry)) return entry;
	const {notification, causes, message, runId, eventDate, ...rest} = entry;
	return rest;
};
