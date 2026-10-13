import {
	MODBUS_CONNECTION_SAVE,
	MODBUS_CONNECTION_LOAD,
	MODBUS_CONNECTION_UPDATE,
	MODBUS_CONNECTIONS_LOAD
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

export const updateModbusConnection =
	(modbusConnection: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODBUS_CONNECTION_UPDATE,
			payload: modbusConnection
		});
	};

export const loadModbusConnections =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				dispatch({
					type: MODBUS_CONNECTIONS_LOAD,
					payload: normalizeIds(
						JSON.parse(response.config).modbusconnections
					)
				});
			}
		);
	};

export const loadModbusConnection =
	(
		modbusConnectionId: string
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: MODBUS_CONNECTION_LOAD,
			payload: modbusConnectionId
		});
	};

export const saveModbusConnection =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/sync/modbusconnection',
			denormalizeIds(data),
			(response: any) => {
				dispatch({
					type: MODBUS_CONNECTION_SAVE,
					payload: normalizeIds(
						JSON.parse(response.config).modbusconnection
					),
					tempId: isTempId(data.id) ? data.id : undefined
				});
			}
		);
	};
