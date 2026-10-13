import {
	ROOT_DEVICES_LOAD,
	ROOT_DEVICE_SAVE,
	ROOT_DEVICE_LOAD,
	ROOT_DEVICE_UPDATE
} from '../actions/types';
import {
	loadDevice,
	loadDevices,
	updateDevice
} from './device-reducer-helper';

const initialState = {
	devices: [],
	device: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case ROOT_DEVICES_LOAD: {
			return {
				...state,
				devices: loadDevices(action.payload)
			};
		}

		case ROOT_DEVICE_LOAD: {
			return {
				...state,
				device: loadDevice(
					state.devices,
					action.payload.deviceId,
					action.payload.defaults
				)
			};
		}

		case ROOT_DEVICE_UPDATE: {
			return {
				...state,
				device: action.payload
			};
		}

		case ROOT_DEVICE_SAVE: {
			return {
				...state,
				devices: updateDevice(
					state.devices,
					action.payload,
					action.tempId
				)
			};
		}

		default:
			return state;
	}
};
