import {
	MODBUS_TASK_SAVE,
	MODBUS_TASK_LOAD,
	MODBUS_TASK_UPDATE,
	MODBUS_TASKS_LOAD
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {socketService} from '../../../../../services/socket';

export const updateModbusTask =
	(modbusTask: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODBUS_TASK_UPDATE,
			payload: modbusTask
		});
	};

export const loadModbusTasks =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				dispatch({
					type: MODBUS_TASKS_LOAD,
					payload: JSON.parse(response.config).modbusconnections
				});
			}
		);
	};

export const loadModbusTask =
	(modbusTaskId: string): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODBUS_TASK_LOAD,
			payload: modbusTaskId
		});
	};

export const saveModbusTask =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/sync/modbusconnection',
			data,
			(response: any) => {
				dispatch({
					type: MODBUS_TASK_SAVE,
					payload: response.config
				});
			}
		);
	};
