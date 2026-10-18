/**
 * Backend/frontend id-field boundary adapter.
 *
 * The backend (Mongoose) names every entity identifier `_id`, while the whole
 * app internally works with `id`. Rather than renaming ~150 references across
 * the codebase, we translate at the socket boundary:
 *
 *   - normalizeIds()   : incoming backend data  `_id` -> `id`
 *   - denormalizeIds() : outgoing request data  `id`  -> `_id`
 *
 * Both walk the value deeply (objects + arrays) and return a fresh copy,
 * leaving the original untouched.
 *
 * Ids are assigned by the backend on insertion. A brand-new entity that has not
 * been persisted yet carries a purely client-side *temporary* id (see
 * `newTempId`) so the app can key/edit/link it before saving. That temp id must
 * never reach the backend: `denormalizeIds` drops it, so the backend receives a
 * payload with no `_id` and inserts a fresh one.
 */

/** Marks a client-only id that has never been persisted. */
export const TEMP_ID_PREFIX = 'temp:';

/**
 * A unique client-side id for a not-yet-saved entity. Uniqueness matters so
 * multiple new entities don't collide on the `findIndex(x => x.id === ...)`
 * merge/lookup logic before any of them is saved.
 */
export const newTempId = (): string =>
	`${TEMP_ID_PREFIX}${Math.random().toString(36).slice(2)}${Date.now()}`;

/** True for a client-only temp id that must not be sent to the backend. */
export const isTempId = (value: any): value is string =>
	typeof value === 'string' && value.startsWith(TEMP_ID_PREFIX);

const isPlainObject = (value: any): value is Record<string, any> =>
	value !== null && typeof value === 'object' && !(value instanceof Date);

const renameKeyDeep = (value: any, from: string, to: string): any => {
	if (Array.isArray(value)) {
		return value.map(item => renameKeyDeep(item, from, to));
	}

	// Plain objects only — leave Date, class instances, etc. as-is.
	if (isPlainObject(value)) {
		const result: Record<string, any> = {};
		for (const key of Object.keys(value)) {
			const nextKey = key === from ? to : key;
			result[nextKey] = renameKeyDeep(value[key], from, to);
		}
		return result;
	}

	return value;
};

/**
 * Deep `id` -> `_id`, except a temp `id` is dropped entirely (never sent).
 */
const denormalizeKeyDeep = (value: any): any => {

	if (Array.isArray(value)) {
		return value.map(item => denormalizeKeyDeep(item));
	}

	if (isPlainObject(value)) {
		const result: Record<string, any> = {};
		for (const key of Object.keys(value)) {
			if (key === 'id') {
				// New (unsaved) entity: omit the id so the backend inserts and
				// generates a fresh `_id`. Persisted entities keep their real id.
				if (isTempId(value[key])) {
					continue;
				}
				result._id = denormalizeKeyDeep(value[key]);
				continue;
			}
			result[key] = denormalizeKeyDeep(value[key]);
		}
		return result;
	}

	return value;
};

/**
 * Sequence conditions boundary: the backend carries a sequence's conditions
 * inside `securityConfig.conditions`, while the app works with
 * `sequence.conditions` (same as cycles and triggers). A sequence is recognised
 * by its `securityConfig` object (no other entity has one).
 *
 *   - liftSequenceConditionsDeep()  : incoming  `securityConfig.conditions` -> `conditions`
 *   - nestSequenceConditionsDeep()  : outgoing  `conditions` -> `securityConfig.conditions`
 */
const mapSequencesDeep = (
	value: any,
	mapSequence: (sequence: Record<string, any>) => Record<string, any>
): any => {
	if (Array.isArray(value)) {
		return value.map(item => mapSequencesDeep(item, mapSequence));
	}
	if (isPlainObject(value)) {
		const result: Record<string, any> = {};
		for (const key of Object.keys(value)) {
			result[key] = mapSequencesDeep(value[key], mapSequence);
		}
		return isPlainObject(result.securityConfig) ? mapSequence(result) : result;
	}
	return value;
};

const liftSequenceConditionsDeep = (value: any): any =>
	mapSequencesDeep(value, sequence => {
		const {conditions, ...securityConfig} = sequence.securityConfig;
		if (conditions === undefined) return sequence;
		return {...sequence, securityConfig, conditions};
	});

const nestSequenceConditionsDeep = (value: any): any =>
	mapSequencesDeep(value, sequence => {
		const {conditions, ...rest} = sequence;
		if (conditions === undefined) return sequence;
		return {
			...rest,
			securityConfig: {...sequence.securityConfig, conditions}
		};
	});

/**
 * Translate backend data for internal use: every `_id` becomes `id`, and a
 * sequence's `securityConfig.conditions` is lifted to `conditions`.
 * Safe to call on any value (objects, arrays, primitives, null/undefined).
 */
export const normalizeIds = <T = any>(value: T): T =>
	liftSequenceConditionsDeep(renameKeyDeep(value, '_id', 'id')) as T;

/**
 * Translate internal data for the backend: every `id` becomes `_id`, while a
 * client-only temp `id` is dropped so the backend assigns the real one, and a
 * sequence's `conditions` is nested into `securityConfig.conditions`.
 * Safe to call on any value (objects, arrays, primitives, null/undefined).
 */
export const denormalizeIds = <T = any>(value: T): T =>
	nestSequenceConditionsDeep(denormalizeKeyDeep(value)) as T;
