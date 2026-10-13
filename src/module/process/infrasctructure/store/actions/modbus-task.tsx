import {MODBUS_TASK_UPDATE, MODBUS_TASKS_LOAD} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {socketService, normalizeIds} from '../../../../../services/socket';

// Stage edits of a single COM request into the transient scratch slot. The COM
// request itself is not persisted here: it is committed into its parent slave's
// in-memory `comRequests` list (see ComRequestSettingsScreen) and saved with the
// device tree when the master is saved (front/box/sync/device).
export const updateModbusTask =
	(modbusTask: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODBUS_TASK_UPDATE,
			payload: modbusTask
		});
	};

// The box's modbusTasks (config.modbusTasks). Kept as a flat list from which a
// slave hydrates its `comRequests` on first open (linked by `deviceId`).
export const loadModbusTasks =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				dispatch({
					type: MODBUS_TASKS_LOAD,
					payload: normalizeIds(
						JSON.parse(response.config).modbusTasks
					)
				});
			}
		);
	};
