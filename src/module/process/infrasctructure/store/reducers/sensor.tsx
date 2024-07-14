
import {
    SENSOR_SAVE,
    SENSORS_LOAD,
    SENSOR_UPDATE,
    SENSOR_LOAD,
    SENSOR_STATUS
} from '../actions/types';
import { loadSensor, loadSensors, updateSensor, updateStatus } from './sensor-reducer-helper';

const initialState = {
    sensors: [],
    values: [],
    sensor: undefined,

};


export default (state = initialState, action: any) => {
    switch (action.type) {

        case SENSORS_LOAD: {
            return {
                ...state,
                sensors: loadSensors(action.payload)
            };
        }

        case SENSOR_LOAD: {
            return {
                ...state,
                sensor: loadSensor(state.sensors, action.payload)
            };
        }

        case SENSOR_UPDATE: {
            return {
                ...state,
                sensor: action.payload
            };
        }

        case SENSOR_SAVE: {
            return {
                ...state,
                sensors: updateSensor(state.sensors, action.payload)
            };
        }

        case SENSOR_STATUS: {
            return {
                ...state,
                values: updateStatus(state.values, action.payload)
            };
        }

        default:
            return state;
    }
};
