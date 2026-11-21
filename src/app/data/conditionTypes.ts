// Shared types & helpers for the condition editing flow, reused by triggers,
// cycles and sequences (the condition flow is parent-agnostic: each condition
// links to its parent via `parentId` + `parentType`).

export enum ConditionSymbolStart {
	OPEN_PAREN = '(',
	NOT = 'not'
}

export enum ConditionSymbolEnd {
	CLOSE_PAREN = ')',
	AND = 'and',
	OR = 'or'
}

// Execution mode for GROUP cycles: run child cycles one after the other
// (SEQUENTIAL) or all at once (PARALLEL).
export enum ExecutionMode {
	SEQUENTIAL = 'SEQUENTIAL',
	PARALLEL = 'PARALLEL'
}

// Parent kinds a condition can belong to.
export type ConditionParentType = 'TRIGGER' | 'CYCLE' | 'SEQUENCE';

export const symbolStartOptions = [
	{label: '(', value: ConditionSymbolStart.OPEN_PAREN},
	{label: 'not', value: ConditionSymbolStart.NOT}
];

export const symbolEndOptions = [
	{label: ')', value: ConditionSymbolEnd.CLOSE_PAREN},
	{label: 'and', value: ConditionSymbolEnd.AND},
	{label: 'or', value: ConditionSymbolEnd.OR}
];

// Guarantees a coherent ordering before persistence: keep an already-set
// `order`, otherwise assign the condition's position in the list (index + 1).
export const assignConditionOrder = (conditions: any[]) =>
	(conditions || []).map((condition: any, index: number) => ({
		...condition,
		order: condition?.order ?? index + 1
	}));
