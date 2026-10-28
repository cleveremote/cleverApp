import {DEVICE_MODELS_LOAD} from '../actions/types';

// Modèles d'appareils (templates) renvoyés par la box dans la configuration
// (`config.models`) : lecture seule, chacun avec ses `deviceCommands`. Un slave
// y est relié par son `modelId`.
const initialState = {
	models: []
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case DEVICE_MODELS_LOAD: {
			return {
				...state,
				models: action.payload || []
			};
		}

		default:
			return state;
	}
};
