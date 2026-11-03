// Historique renvoyé par 'box/fetch/events' : une liste de runs, un par
// démarrage. Les sous-types (origin, stop, confirmation…) sont lus de façon
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

export const toCycleRuns = (raw: any): CycleRun[] => {
	const value = typeof raw === 'string' ? safeParse(raw) : raw;
	return Array.isArray(value) ? value : [];
};

const safeParse = (raw: string) => {
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
};
