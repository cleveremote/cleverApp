import {
	ROOT_DEVICE_SAVE,
	ROOT_DEVICE_LOAD,
	ROOT_DEVICE_UPDATE,
	ROOT_DEVICES_LOAD,
	MODBUS_TASKS_LOAD
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds
} from '../../../../../services/socket';

export const updateDevice =
	(device: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: ROOT_DEVICE_UPDATE,
			payload: device
		});
	};

// Soft-save a device into the in-memory `devices` list without hitting the box.
// Used when a nested slave menu validates its edits: the change must appear in
// the master's slave list and survive re-entry immediately (no socket round-trip
// required), while the real box persistence is deferred to the master's save,
// which pushes every dirty slave. Mirrors how a cycle soft-saves its sequences.
export const stageDevice =
	(device: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: ROOT_DEVICE_SAVE,
			payload: device
		});
	};

export const loadDevices =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				dispatch({
					type: ROOT_DEVICES_LOAD,
					payload: normalizeIds(JSON.parse(response.config).devices)
				});
			}
		);
	};

export const loadDevice =
	(
		deviceId: string,
		defaults?: Record<string, any>
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: ROOT_DEVICE_LOAD,
			payload: {deviceId, defaults}
		});
	};

// Persist a whole device tree in one round-trip: a master carrying its
// `slaveDevices`, each slave carrying its `comRequests`. `denormalizeIds` walks
// the nested payload deeply (id -> _id, temp ids dropped), so the parent/child
// links are expressed by nesting rather than by masterDeviceId/deviceId. The box
// returns the refreshed full configuration, so we reload both the devices and
// modbusTasks slices — every client-only `isModified` flag is cleared and temp
// ids are replaced by the real ones the box assigned.
export const saveDeviceTree =
	(
		tree: any,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/sync/device',
			denormalizeIds(tree),
			(response: any) => {
				const config = JSON.parse(response.config);
				dispatch({
					type: ROOT_DEVICES_LOAD,
					payload: normalizeIds(config.devices)
				});
				dispatch({
					type: MODBUS_TASKS_LOAD,
					payload: normalizeIds(config.modbusTasks)
				});
				onSuccess?.();
			}
		);
	};

// Ask the box to probe the master's `discoveryRegisters` on the
// DEFAULT_UNCONFIGURED_UNIT_ID and register any newly-found slave devices.
// The backend returns the refreshed configuration, so we reload the whole
// device list from the response.
export const discoverDevices =
	(
		masterId: string,
		cb?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/discover/device',
			{masterId},
			(response: any) => {
				dispatch({
					type: ROOT_DEVICES_LOAD,
					payload: normalizeIds(JSON.parse(response.config).devices)
				});
				cb?.();
			}
		);
	};
