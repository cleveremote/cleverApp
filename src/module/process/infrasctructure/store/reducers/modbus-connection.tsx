import {
	MODBUS_CONNECTIONS_LOAD,
	MODBUS_CONNECTION_SAVE,
	MODBUS_CONNECTION_LOAD,
	MODBUS_CONNECTION_UPDATE
} from '../actions/types';
import {
	loadModbusConnection,
	loadModbusConnections,
	updateModbusConnection
} from './modbus-connection-reducer-helper';

const initialState = {
	modbusConnections: [],
	modbusConnection: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case MODBUS_CONNECTIONS_LOAD: {
			return {
				...state,
				modbusConnections: loadModbusConnections(action.payload)
			};
		}

		case MODBUS_CONNECTION_LOAD: {
			return {
				...state,
				modbusConnection: loadModbusConnection(
					state.modbusConnections,
					action.payload
				)
			};
		}

		case MODBUS_CONNECTION_UPDATE: {
			return {
				...state,
				modbusConnection: action.payload
			};
		}

		case MODBUS_CONNECTION_SAVE: {
			return {
				...state,
				modbusConnections: updateModbusConnection(
					state.modbusConnections,
					action.payload
				)
			};
		}

		default:
			return state;
	}
};
