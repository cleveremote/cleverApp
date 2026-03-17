import {combineReducers} from 'redux';
import sensor from './sensor';
import stateReducer from './stateReducer';
import schedule from './schedule';
import trigger from './trigger';
import condition from './condition';
import cycle from './cycle';
import sequence from './sequence';
import module from './module';
import modbusConnection from './modbus-connection';
import modbusTask from './modbus-task';

export default combineReducers({
	status: stateReducer,
	root_modbus_connection: modbusConnection,
	root_modbus_task: modbusTask,
	root_sensor: sensor,
	root_cycle: cycle,
	cycle_sequence: sequence,
	sequence_module: module,
	cycle_schedule: schedule,
	cycle_trigger: trigger,
	trigger_condition: condition
});
