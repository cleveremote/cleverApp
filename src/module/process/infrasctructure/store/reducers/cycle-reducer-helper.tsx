import { newTempId } from '../../../../../services/socket';
import i18n from 'i18next';

export const getKeys = (svg: string) => {
	const matches = svg.match(/sel_./g);
	const res = {} as any;
	matches?.forEach(key => {
		res[key] = false;
	});
	return Object.keys(res).map(key => ({
		label: key,
		value: key
	}));
};

export const loadCycles = (cycles: any) => {
	return cycles || [];
};

export const loadCycle = (
	cycles: any,
	cycleId: string,
	parentCycleId?: string,
	// Optional entity type for the new-cycle template (e.g. `MODULE`); a plain
	// cycle when omitted.
	newType?: string
) => {
	if (cycleId) {
		return cycles.find((x: any) => x.id === cycleId);
	} else {
		// Auto-positionne le type de l'entité créée : MODULE pour un module,
		// CYCLE par défaut pour un cycle classique (les GROUP/fertigations
		// passent par newGroup()).
		const type = newType ?? 'CYCLE';
		const label =
			type === 'MODULE' || type === 'PROPORTIONAL'
				? i18n.t('common:defaults.newModule')
				: i18n.t('common:defaults.newCycle');
		return {
			id: newTempId(),
			type,
			name: label,
			description: label,
			// Set when the cycle is created from a GROUP's Cycles section: the box
			// links it back to that group as a `childCycle` when the cycle is saved.
			parentCycleId: parentCycleId ?? null,
			style: {
				bgColor: '#a5f3fc',
				fontColor: '#60a5fa',
				iconColor: { base: '#60a5fa', icon: '#60a5fa' }
			},
			modePriority: [
				{ mode: 'MANUAL', priority: 0 },
				{ mode: 'SCHEDULE', priority: 1 },
				{ mode: 'TRIGGER', priority: 2 },
				{ mode: 'AUTO', priority: 3 },
				{ mode: 'SYSTEM', priority: 4 }
			],
			sequences: [],
			isModified: true
		};
	}
};

export const updateCycle = (prevCycles: any, cycle: any, tempId?: string) => {
	// Drop the temporary optimistic entry (if any) now that the backend has
	// assigned a real id, so it doesn't linger as a duplicate.
	const previous: any[] = tempId
		? prevCycles.filter((x: any) => x.id !== tempId)
		: [...prevCycles];
	if (cycle) {
		const index = previous.findIndex(x => x.id === cycle?.id);
		if (index > -1) {
			previous[index] = cycle;
		} else {
			previous.push(cycle);
		}
	}
	return previous;
};

// export const updateStatus = (prevCycles: any, status: any) => {
//     const cycles = [...prevCycles];
//     let sequences: any[] = [];
//     if (status.type === 'CYCLE') {
//         const index = cycles.findIndex(x => x.id === status.id);
//         const startIndex = (cycles[index].progression?.startIndex || 0);
//         const step = ((100) / ((status.duration) / 1000));
//         cycles[index] = { ...cycles[index], status: status.status, progression: status.status === 'STOPPED' ? undefined : { startIndex: startIndex > 100 ? 100 : startIndex, step } };
//         if (status.overridedDuration) {
//             sequences = [...cycles[index].sequences];
//             sequences.forEach(seq => {
//                 seq.overridedDuradion = status.overridedDuration;
//             });
//             cycles[index] = { ...cycles[index], sequences: sequences };
//         } else {
//             sequences = [...cycles[index].sequences];
//             sequences.forEach(seq => {
//                 seq.overridedDuradion = undefined;
//             });
//             cycles[index] = { ...cycles[index], sequences: sequences };
//         }
//     } else {
//         for (const cycle of cycles) {
//             let duration = 0;
//             cycle.sequences.forEach((x: any) => duration = duration + x.maxDuration);
//             const seqIndex = cycle.sequences.findIndex((x: any) => x.id === status.id);
//             if (seqIndex > -1) {
//                 sequences = [...cycle.sequences];
//                 sequences[seqIndex] = { ...sequences[seqIndex], status: status.status, progression: status.status === 'STOPPED' ? undefined : { startedAt: status.startedAt, duration: status.duration } };
//                 const index = cycles.findIndex(x => x.id === cycle.id);
//                 if (status.status === 'STOPPED') {
//                     const startIndex = (cycle.progression?.startIndex || 0) + (status.duration * 100 / duration);
//                     const step = ((100) / ((duration) / 1000));
//                     cycles[index] = { ...cycle, sequences: sequences, progression: { ...cycle.progression, startIndex: startIndex > 100 ? 100 : startIndex, step } };
//                 } else {
//                     cycles[index] = { ...cycle, sequences: sequences };
//                 }
//                 break;
//             }
//         }
//     }

//     return cycles;
// }

// Le box n'envoie « conditions non vérifiées » qu'une fois : les status
// suivants (refresh, push) ne la portent plus. On la garde, avec ses causes,
// jusqu'à ce que l'utilisateur y réponde (Ignorer / Forcer → dismiss) ou que
// l'exécutable démarre. Une nouvelle notification du box remplace l'ancienne.
const PERSISTENT_NOTIFICATION = 'CONDITIONS_NOT_VERIFIED';
const WAITING_CONFIRMATION = 'WAITTING_CONFIRMATION';
export const keepPendingNotifications = (prevStatus: any[], nextStatus: any[]) =>
	nextStatus.map((next: any) => {
		const prev = prevStatus.find((x: any) => x?.id === next?.id);
		// Un snapshot (fetch de configuration au retour dans l'app) peut ne pas
		// porter `confirmation` : on garde celle reçue par socket tant que
		// l'attente de confirmation dure, pour ne pas basculer d'un « démarrage
		// planifié » vers le message de conflit.
		if (
			next?.status === WAITING_CONFIRMATION &&
			!next.confirmation &&
			prev?.status === WAITING_CONFIRMATION &&
			prev.confirmation
		) {
			next = {...next, confirmation: prev.confirmation};
		}
		if (
			prev?.notification !== PERSISTENT_NOTIFICATION ||
			next?.notification ||
			next?.status === 'IN_PROCCESS'
		) {
			return next;
		}
		return {
			...next,
			notification: prev.notification,
			causes: prev.causes,
			message: prev.message,
			runId: prev.runId,
			eventDate: prev.eventDate
		};
	});

// Heure (téléphone) d'arrivée d'une notification ou d'une attente de
// confirmation : sans runId (push WebSocket), le bandeau s'en sert pour
// n'afficher que l'événement correspondant, pas le précédent.
const WAITING = 'WAITTING_CONFIRMATION';
export const stampNotified = (prevStatus: any[], nextStatus: any[]) =>
	nextStatus.map((next: any) => {
		const prev = prevStatus.find((x: any) => x?.id === next?.id);
		const isNew =
			(next?.notification && next.notification !== prev?.notification) ||
			(next?.status === WAITING && prev?.status !== WAITING);
		if (isNew) return {...next, notifiedAt: Date.now()};
		return prev?.notifiedAt && (next?.notification || next?.status === WAITING)
			? {...next, notifiedAt: prev.notifiedAt}
			: next;
	});

export const updateStatus = (prevSatus: any, status: any) => {
	const values = [...prevSatus];
	status.forEach((element: any) => {
		const index = values.findIndex(x => x.id === element.id);
		if (index > -1) {
			values[index] = { ...element };
		} else {
			values.push(element);
		}
	});
	return values;
};
