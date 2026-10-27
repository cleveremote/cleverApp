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
import {loadConfiguration} from './common';

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
				const devices = JSON.parse(response.config).devices;
				// TEMP diagnostic: which reload blanks the masters list.
				console.log(
					'[devices] loadDevices',
					(devices || []).filter((d: any) => d.type === 'MASTER').length
				);
				dispatch({
					type: ROOT_DEVICES_LOAD,
					payload: normalizeIds(devices)
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
// ids are replaced by the real ones the box assigned. When the tree carries a
// deleted slave, the whole configuration is reloaded too: the box drops the
// slave's dependent entities (sensors, modbus tasks...) along with it.
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
				// A deleted slave: skip the sync response's snapshot and leave only
				// once the full configuration reload has landed, so the lists are
				// replaced a single time with the final state (no flicker).
				if ((tree?.slaveDevices || []).some((s: any) => !!s.delete)) {
					dispatch(loadConfiguration(onSuccess));
					return;
				}
				const config = JSON.parse(response.config);
				// TEMP diagnostic: which reload blanks the masters list.
				console.log(
					'[devices] saveDeviceTree',
					(config.devices || []).filter((d: any) => d.type === 'MASTER').length
				);
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
// Without `masterId` (Devices screen), the box runs a global discovery.
// The discovered devices are appended to the current list: entries already
// known (same id) are kept as-is, so local unsaved edits are not overwritten —
// discovery only ever adds new devices. A slave discovery (with `masterId`)
// then reloads the whole configuration, since the box may have created
// entities tied to the new slaves (sensors, modbus tasks...).
export const discoverDevices =
	(
		masterId?: string,
		cb?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		socketService.emit(
			'front/box/discover/device',
			masterId ? {masterId} : {},
			(response: any) => {
				// `cb` doit toujours être appelé (il arrête le loader de l'écran),
				// même si la réponse est une erreur ou un `config` illisible :
				// une exception ici l'empêcherait d'être exécuté.
				try {
					const raw = response?.config;
					const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
					if (config) {
						const found = normalizeIds(config);
						const existing = getState().root_device.devices ?? [];
						const knownIds = new Set(existing.map((d: any) => `${d.id}`));
						const added = (Array.isArray(found) ? found : [found]).filter(
							(d: any) => d?.id && !knownIds.has(`${d.id}`)
						);
						if (added.length) {
							dispatch({
								type: ROOT_DEVICES_LOAD,
								payload: [...existing, ...added]
							});
						}
						if (masterId) {
							dispatch(loadConfiguration());
						}
					} else {
						console.warn('[discoverDevices] unexpected response', response);
					}
				} catch (e) {
					console.warn('[discoverDevices] failed to handle response', e);
				} finally {
					cb?.();
				}
			}
		);
	};
