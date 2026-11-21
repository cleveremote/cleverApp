import {INVERTERS_LOAD, INVERTER_SAVE} from '../actions/types';
import {updateActuator as mergeById} from './actuator-reducer-helper';

// Variateurs renvoyés par la box dans la configuration (`config.inverters`),
// mis à jour à chaque sauvegarde de leur configuration. Chacun est relié à son
// slave par `deviceId` et porte son profil, ses commandes (rôle → device
// command) et ses paramètres (bloc, valeur, commandes de lecture / écriture).
const initialState = {
	inverters: []
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case INVERTERS_LOAD: {
			return {
				...state,
				inverters: action.payload || []
			};
		}

		case INVERTER_SAVE: {
			return {
				...state,
				inverters: mergeById(state.inverters, action.payload)
			};
		}

		default:
			return state;
	}
};
