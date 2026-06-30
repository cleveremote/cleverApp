import {
	MODULES_LOAD,
	MODULE_UPDATE,
	MODULES_GLOBAL_LOAD,
	DEVICES_LOAD,
	DEVICE_UPDATE
} from '../actions/types';
import {
	loadModules,
	updateModule,
	loadDevices,
	updateDevice
} from './module-reducer-helper';

const initialState = {
	modules: [],
	devices: []
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case MODULES_LOAD: {
			return {
				...state,
				modules: loadModules(action.payload)
			};
		}
		case MODULES_GLOBAL_LOAD: {
			return {
				...state,
				modules: action.payload
			};
		}
		case MODULE_UPDATE:
			return {
				...state,
				modules: updateModule(state.modules, action.payload)
			};
		case DEVICES_LOAD: {
			return {
				...state,
				devices: loadDevices(action.payload)
			};
		}
		case DEVICE_UPDATE:
			return {
				...state,
				devices: updateDevice(state.devices, action.payload)
			};
		default:
			return state;
	}
};
