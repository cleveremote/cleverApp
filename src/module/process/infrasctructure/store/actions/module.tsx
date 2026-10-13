import {
	MODULE_UPDATE,
	MODULES_LOAD,
	DEVICE_UPDATE,
	DEVICES_LOAD,
	SEQUENCE_MODULE_CONFIGS_LOAD,
	SEQUENCE_MODULE_CONFIG_UPDATE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';

export const updateModule =
	(module: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODULE_UPDATE,
			payload: module
		});
	};

export const loadModules =
	(sequence: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODULES_LOAD,
			payload: sequence
		});
		dispatch({
			type: DEVICES_LOAD,
			payload: sequence
		});
	};

export const updateDevice =
	(device: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: DEVICE_UPDATE,
			payload: device
		});
	};

export const loadSequenceModuleConfigs =
	(sequence: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SEQUENCE_MODULE_CONFIGS_LOAD,
			payload: sequence
		});
	};

export const updateSequenceModuleConfig =
	(moduleConfig: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SEQUENCE_MODULE_CONFIG_UPDATE,
			payload: moduleConfig
		});
	};
