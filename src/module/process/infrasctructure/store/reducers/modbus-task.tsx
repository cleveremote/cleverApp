import {MODBUS_TASKS_LOAD, MODBUS_TASK_UPDATE} from '../actions/types';
import {loadModbusTasks} from './modbus-task-reducer-helper';

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

		case MODBUS_TASK_UPDATE: {
			return {
				...state,
				modbusTask: action.payload
			};
		}

		default:
			return state;
	}
};
