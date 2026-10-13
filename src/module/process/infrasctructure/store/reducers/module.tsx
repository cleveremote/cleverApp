import {
	MODULES_LOAD,
	MODULE_UPDATE,
	MODULES_GLOBAL_LOAD,
	DEVICES_LOAD,
	DEVICE_UPDATE,
	SEQUENCE_MODULE_CONFIGS_LOAD,
	SEQUENCE_MODULE_CONFIG_UPDATE
} from '../actions/types';
import {
	loadModules,
	updateModule,
	loadDevices,
	updateDevice,
	loadSequenceModuleConfigs,
	updateSequenceModuleConfig
} from './module-reducer-helper';

const initialState = {
	modules: [],
	devices: [],
	moduleConfigs: []
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
		case SEQUENCE_MODULE_CONFIGS_LOAD: {
			return {
				...state,
				moduleConfigs: loadSequenceModuleConfigs(action.payload)
			};
		}
		case SEQUENCE_MODULE_CONFIG_UPDATE:
			return {
				...state,
				moduleConfigs: updateSequenceModuleConfig(
					state.moduleConfigs,
					action.payload
				)
			};
		default:
			return state;
	}
};
