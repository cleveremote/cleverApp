import {
	TRIGGER_SAVE,
	TRIGGERS_LOAD,
	TRIGGER_UPDATE,
	TRIGGER_LOAD,
	TRIGGERS_SAVE
} from '../actions/types';
import {
	loadTrigger,
	loadTriggers,
	updateTrigger
} from './trigger-reducer-helper';

const initialState = {
	triggers: [],
	trigger: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case TRIGGERS_LOAD: {
			return {
				...state,
				triggers: loadTriggers(action.payload)
			};
		}

		case TRIGGER_LOAD: {
			return {
				...state,
				trigger: loadTrigger(
					state.triggers,
					action.payload.triggerId,
					action.payload.cycleId
				)
			};
		}

		case TRIGGER_UPDATE: {
			return {
				...state,
				trigger: action.payload
			};
		}

		case TRIGGER_SAVE: {
			return {
				...state,
				triggers: updateTrigger(state.triggers, action.payload)
			};
		}

		case TRIGGERS_SAVE: {
			return {
				...state,
				triggers: action.payload.triggers
			};
		}

		default:
			return state;
	}
};
