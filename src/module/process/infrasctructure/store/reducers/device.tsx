import {
	ROOT_DEVICES_LOAD,
	ROOT_DEVICE_SAVE,
	ROOT_DEVICE_LOAD,
	ROOT_DEVICE_UPDATE,
	DEVICE_CONNECTIVITY_LOAD,
	DEVICE_CONNECTIVITY_UPDATE
} from '../actions/types';
import {
	loadDevice,
	loadDevices,
	updateDevice
} from './device-reducer-helper';
import {
	ConnectivityMap,
	connectivityFromDevices,
	mergeConnectivity
} from '../models/deviceConnectivity';

const initialState: {
	devices: any[];
	device: any;
	connectivity: ConnectivityMap;
} = {
	devices: [],
	device: undefined,
	connectivity: {}
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case ROOT_DEVICES_LOAD: {
			// A malformed answer (no `devices` array) must not blank the list.
			if (!Array.isArray(action.payload)) return state;
			return {
				...state,
				devices: loadDevices(action.payload),
				connectivity: connectivityFromDevices(
					action.payload,
					state.connectivity
				)
			};
		}

		// Devices de la configuration relus hors ROOT_DEVICES_LOAD (rechargement
		// des cycles, par ex.) : seule leur connectivité est reprise.
		case DEVICE_CONNECTIVITY_LOAD: {
			if (!Array.isArray(action.payload)) return state;
			return {
				...state,
				connectivity: connectivityFromDevices(
					action.payload,
					state.connectivity
				)
			};
		}

		case DEVICE_CONNECTIVITY_UPDATE: {
			const entries = (
				Array.isArray(action.payload) ? action.payload : [action.payload]
			).filter(Boolean);
			const connectivity = mergeConnectivity(state.connectivity, entries);
			return connectivity === state.connectivity
				? state
				: {...state, connectivity};
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
