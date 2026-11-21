import {
	ACTUATORS_LOAD,
	ACTUATOR_LOAD,
	ACTUATOR_SAVE,
	ACTUATOR_UPDATE
} from '../actions/types';
import {
	loadActuator,
	loadActuators,
	updateActuator
} from './actuator-reducer-helper';

const initialState = {
	actuators: [],
	actuator: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case ACTUATORS_LOAD: {
			return {
				...state,
				actuators: loadActuators(action.payload)
			};
		}

		case ACTUATOR_LOAD: {
			return {
				...state,
				actuator: loadActuator(
					state.actuators,
					action.payload.actuatorId,
					action.payload.defaults
				)
			};
		}

		case ACTUATOR_UPDATE: {
			return {
				...state,
				actuator: action.payload
			};
		}

		case ACTUATOR_SAVE: {
			return {
				...state,
				actuators: updateActuator(
					state.actuators,
					action.payload,
					action.tempId
				)
			};
		}

		default:
			return state;
	}
};
