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
import device from './device';
import actuator from './actuator';
import settings from './settings';

export default combineReducers({
	status: stateReducer,
	root_settings: settings,
	root_modbus_connection: modbusConnection,
	root_modbus_task: modbusTask,
	root_device: device,
	root_actuator: actuator,
	root_sensor: sensor,
	root_cycle: cycle,
	cycle_sequence: sequence,
	sequence_module: module,
	cycle_schedule: schedule,
	cycle_trigger: trigger,
	trigger_condition: condition
});
