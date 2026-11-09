import {combineReducers} from 'redux';
import login from './login';

export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';

const allReducers = combineReducers({
	login: login
});

export const logout = user => (dispatch, getState) =>
	new Promise(function (resolve, reject) {
		dispatch({
			type: LOGOUT_SUCCESS
		});
		resolve(true);
	});

const rootReducer = (state, action) => allReducers(state, action);

export default rootReducer;
