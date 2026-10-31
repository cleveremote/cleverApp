import {
	CONTROL_LOOPS_LOAD,
	CONTROL_LOOP_SAVE,
	CONTROL_LOOP_UPDATE
} from '../actions/types';
import {updateActuator as mergeById} from './actuator-reducer-helper';

// Boucles de régulation des vannes CTRL (`config.controlLoops`). `loop` est la
// boucle en cours d'édition dans les réglages d'une vanne, `loops` la liste
// relue de la box et mise à jour à chaque sauvegarde.
const initialState = {
	loops: [],
	loop: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case CONTROL_LOOPS_LOAD: {
			return {
				...state,
				loops: action.payload || []
			};
		}

		case CONTROL_LOOP_UPDATE: {
			return {
				...state,
				loop: action.payload
			};
		}

		case CONTROL_LOOP_SAVE: {
			return {
				...state,
				loops: mergeById(state.loops, action.payload, action.tempId)
			};
		}

		default:
			return state;
	}
};
