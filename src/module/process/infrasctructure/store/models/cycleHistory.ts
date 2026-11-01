// Historique d'un cycle renvoyé par 'box/fetch/events' : un run par
// démarrage, plus les anciens events sans runId (avant la mise à jour, reset
// boot). Les sous-types (origin, stop, confirmation…) sont lus de façon
// tolérante : seuls les champs utiles au rendu sont typés.

export type RunOutcome =
	| 'RUNNING'
	| 'WAITING_CONFIRMATION'
	| 'QUEUED'
	| 'ENDED'
	| 'CANCELLED'
	| 'REFUSED';

export type EventOrigin = {
	type?: string;
	id?: string;
	name?: string;
	by?: string;
	[key: string]: any;
};

export type EventStop = {
	reason?: string;
	by?: string;
	message?: string;
	[key: string]: any;
};

export type EventConfirmation = {
	answer?: string;
	waitMs?: number;
	answeredBy?: string;
	[key: string]: any;
};

export type ProcessEventData = Record<string, any>;

export type RunTimelineEntry = {
	date: string;
	elementId: string;
	elementType: 'CYCLE' | 'SEQUENCE';
	kind?: string;
	name?: string;
	message?: string;
	data: ProcessEventData;
};

export type CycleRun = {
	runId: string;
	cycleId: string;
	name?: string;
	outcome: RunOutcome;
	origin?: EventOrigin;
	parentRunId?: string;
	confirmation?: EventConfirmation;
	stop?: EventStop;
	requestedAt: string;
	startedAt?: string;
	endedAt?: string;
	realDuration?: number;
	plannedDuration?: number;
	sequences?: {run: string[]; skipped: string[]; forced: string[]};
	preempted?: string[];
	conditions?: string[];
	message?: string;
	timeline: RunTimelineEntry[];
};

export type CycleHistory = {
	cycleId?: string;
	runs: CycleRun[];
	legacy: any[];
};

export const EMPTY_HISTORY: CycleHistory = {runs: [], legacy: []};

// Ancien format (tableau d'events) : tout part dans `legacy`.
export const toCycleHistory = (raw: any): CycleHistory => {
	const value = typeof raw === 'string' ? safeParse(raw) : raw;
	if (Array.isArray(value)) {
		return {runs: [], legacy: value};
	}
	return {
		cycleId: value?.cycleId,
		runs: Array.isArray(value?.runs) ? value.runs : [],
		legacy: Array.isArray(value?.legacy) ? value.legacy : []
	};
};

const safeParse = (raw: string) => {
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
};
