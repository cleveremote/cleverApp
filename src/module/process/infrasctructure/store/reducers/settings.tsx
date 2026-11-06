import {
	ACCOUNT_LOAD,
	RESET_STORE,
	SETTINGS_LOAD,
	SETTINGS_SAVE,
	SETTINGS_UPDATE
} from '../actions/types';

// Box-level settings: a single object (no list), fetched with
// `front/box/fetch/settings` and persisted with `front/box/sync/settings`.
// `account` : compte de la box, remonté par `front/box/fetch/configuration`.
const initialState = {
	settings: undefined,
	account: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		// Les settings appartiennent à la session box : on repart à vide au
		// logout, sinon ceux de la session précédente réapparaissent.
		case RESET_STORE: {
			return {
				...state,
				settings: initialState.settings,
				account: initialState.account
			};
		}

		case SETTINGS_LOAD:
		case SETTINGS_UPDATE:
		case SETTINGS_SAVE: {
			return {
				...state,
				settings: action.payload
			};
		}

		case ACCOUNT_LOAD: {
			return {
				...state,
				account: action.payload
			};
		}

		default:
			return state;
	}
};
