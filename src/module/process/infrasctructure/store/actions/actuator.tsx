import {
	ACTUATORS_LOAD,
	ACTUATOR_LOAD,
	ACTUATOR_SAVE,
	ACTUATOR_UPDATE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds,
	isTempId
} from '../../../../../services/socket';

// TEMPORARY MOCK — remove once the backend delivers `config.actuators`.
// Lets us exercise the three RPI/COM/CTRL accordions and the CTRL config flow
// before the box configuration exposes the actuator list.
const MOCK_ACTUATORS = [
	{id: 'rpi-1', name: 'Relay 1', type: 'RPI'},
	{id: 'rpi-2', name: 'Relay 2', type: 'RPI'},
	{id: 'rpi-3', name: 'Relay 3', type: 'RPI'},
	{id: 'com-1', name: 'Modbus Pump', type: 'COM'},
	{id: 'com-2', name: 'Modbus Mixer', type: 'COM'},
	{id: 'ctrl-1', name: 'Valve A', type: 'CTRL'},
	{id: 'ctrl-2', name: 'Valve B', type: 'CTRL'},
	{id: 'ctrl-3', name: 'Dosing Pump', type: 'CTRL'}
];

// Master list of actuators, surfaced at the top level of the box configuration
// (same level as `cycles`, `sensors`). Each entry follows `ActuatorModel`:
// `{ id, name, description, type, config }` where `type` is 'RPI' | 'COM' |
// 'CTRL' and `config` carries the matching Rpi/Com/Ctrl shape.
export const loadActuators =
	(): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				let actuators;
				try {
					actuators = JSON.parse(response.config).actuators;
				} catch {
					actuators = undefined;
				}
				if (actuators?.length) {
					dispatch({
						type: ACTUATORS_LOAD,
						payload: normalizeIds(actuators)
					});
					return;
				}
				// TEMPORARY: the box has no `actuators` field yet. Seed the mock
				// once, then keep whatever the user edited locally instead of
				// overwriting it on every reload. Drop this whole branch once the
				// backend exposes the list.
				if (getState().root_actuator.actuators?.length) return;
				dispatch({
					type: ACTUATORS_LOAD,
					payload: normalizeIds(MOCK_ACTUATORS)
				});
			}
		);
	};

// Charge l'actuator édité dans le slot partagé `root_actuator.actuator`. Sans
// `actuatorId`, on crée une entité temporaire à partir de `defaults` (l'écran
// fournit le type et sa config vide) — même schéma que les devices.
export const loadActuator =
	(
		actuatorId?: string,
		defaults?: Record<string, any>
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: ACTUATOR_LOAD,
			payload: {actuatorId, defaults}
		});
	};

export const updateActuator =
	(actuator: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: ACTUATOR_UPDATE,
			payload: actuator
		});
	};

// Persiste un actuator (création, modification ou suppression via `delete`).
// La liste est d'abord mise à jour de façon optimiste pour que l'écran des
// actuators reflète l'édition immédiatement — y compris tant que la box ne
// renvoie pas encore d'`actuators` dans sa configuration (voir loadActuators) —
// puis réalignée sur l'entité renvoyée par la box.
export const saveActuator =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		const tempId = isTempId(data.id) ? data.id : undefined;
		const {isModified, ...persisted} = data;
		dispatch({type: ACTUATOR_SAVE, payload: persisted});
		socketService.emit(
			'front/box/sync/actuator',
			denormalizeIds(data),
			(response: any) => {
				let saved;
				try {
					saved = normalizeIds(JSON.parse(response.config).actuator);
				} catch {
					saved = undefined;
				}
				if (!saved) return;
				dispatch({
					type: ACTUATOR_SAVE,
					payload: saved,
					tempId
				});
			}
		);
	};
