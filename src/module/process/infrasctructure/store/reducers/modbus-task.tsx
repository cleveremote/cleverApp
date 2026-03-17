import {
	MODBUS_TASKS_LOAD,
	MODBUS_TASK_SAVE,
	MODBUS_TASK_LOAD,
	MODBUS_TASK_UPDATE
} from '../actions/types';
import {
	loadModbusTask,
	loadModbusTasks,
	updateModbusTask
} from './modbus-task-reducer-helper';

const initialState = {
	modbusTasks: [],
	modbusTask: undefined
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case MODBUS_TASKS_LOAD: {
			return {
				...state,
				modbusTasks: loadModbusTasks(action.payload)
			};
		}

		case MODBUS_TASK_LOAD: {
			return {
				...state,
				modbusTask: loadModbusTask(state.modbusTasks, action.payload)
			};
		}

		case MODBUS_TASK_UPDATE: {
			return {
				...state,
				modbusTask: action.payload
			};
		}

		case MODBUS_TASK_SAVE: {
			return {
				...state,
				modbusTasks: updateModbusTask(state.modbusTasks, action.payload)
			};
		}

		default:
			return state;
	}
};
