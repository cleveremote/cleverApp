import {
	CYCLE_SAVE,
	CYCLES_LOAD,
	CYCLE_UPDATE,
	CYCLE_LOAD,
	CYCLE_STATUS,
	CYCLE_EXECUTE,
	DATA_LOAD,
	EVENTS_LOAD,
	RESET_STORE,
	PLAN_LOAD,
	GROUPS_LOAD,
	GROUP_SAVE
} from '../actions/types';
import {
	getKeys,
	loadCycle,
	loadCycles,
	updateCycle,
	updateStatus
} from './cycle-reducer-helper';

const initialState = {
	cycles: [],
	groups: [],
	cycle: undefined,
	plan: undefined,
	planSections: [],
	status: [],
	isLoading: false,
	data: [],
	events: []
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case RESET_STORE:
			return {
				...state,
				cycles: initialState.cycles,
				groups: initialState.groups,
				// Sans ça, les status de la session précédente réapparaissent au
				// login suivant, avant le premier fetch.
				status: initialState.status
			};
		case PLAN_LOAD: {
			return {
				...state,
				plan: action.payload,
				planSections: getKeys(action.payload)
			};
		}
		case CYCLES_LOAD: {
			return {
				...state,
				cycles: loadCycles(action.payload)
			};
		}

		case GROUPS_LOAD: {
			return {
				...state,
				groups: action.payload || []
			};
		}

		case GROUP_SAVE: {
			return {
				...state,
				groups: updateCycle(state.groups, action.payload, action.tempId)
			};
		}

		case CYCLE_LOAD: {
			return {
				...state,
				cycle: loadCycle(
					state.cycles,
					action.payload,
					action.parentCycleId,
					action.newType
				)
			};
		}

		case CYCLE_UPDATE: {
			return {
				...state,
				cycle: action.payload
			};
		}

		case CYCLE_SAVE: {
			return {
				...state,
				cycles: updateCycle(state.cycles, action.payload, action.tempId)
			};
		}

		case CYCLE_STATUS: {
			const data = Array.isArray(action.payload)
				? action.payload
				: [action.payload];
			return {
				...state,
				// Un fetch renvoie l'état complet : on remplace pour purger les
				// entrées périmées. Les pushs socket restent des deltas et
				// conservent l'upsert.
				status: action.replace ? data : updateStatus(state.status, data)
			};
		}

		case DATA_LOAD: {
			return {
				...state,
				data: action.payload
			};
		}

		case EVENTS_LOAD: {
			return {
				...state,
				events: action.payload || []
			};
		}

		case CYCLE_EXECUTE: {
			return {
				...state,
				isLoading: action.payload
			};
		}

		default:
			return state;
	}
};
