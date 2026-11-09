import {INVERTERS_LOAD} from '../actions/types';

// Variateurs renvoyés par la box dans la configuration (`config.inverters`) :
// lecture seule. Chacun est relié à son slave par `deviceId` et porte son
// profil, ses commandes (rôle → device command) et ses paramètres (bloc,
// valeur, commandes de lecture / écriture).
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

		default:
			return state;
	}
};
