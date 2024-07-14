
import {
    SENSORS_LOAD,
    SENSOR_LOAD,
    SENSOR_SAVE,
    SENSOR_UPDATE
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { authenticationService } from '../../../../authentication/domain/services/auth.service';


export const updateSensor = (sensor: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SENSOR_UPDATE,
        payload: sensor,
    });
}

export const loadSensors = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.emit('front/box/fetch/configuration', {}, (response: any) => {
        dispatch({
            type: SENSORS_LOAD,
            payload: JSON.parse(response.config).sensors,
        });
    });
};

export const loadSensor = (sensorId: string): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SENSOR_LOAD,
        payload: sensorId
    });
}

export const saveSensor = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.emit('front/box/sync/sensor', data, (response: any) => {
        dispatch({
            type: SENSOR_SAVE,
            payload: JSON.parse(response.config).sensor,
        });
    });
};