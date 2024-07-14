
import {  SENSOR_UPDATE, CYCLE_UPDATE, SET_BOX_CONNECTED, CYCLE_STATUS, SENSOR_STATUS, CYCLES_LOAD, SENSORS_LOAD, CYCLE_SAVE, SENSOR_SAVE } from './types';
import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { authenticationService } from '../../../../authentication/domain/services/auth.service';


export const listenerEvents = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    console.log("enter times")
    authenticationService.socket?.on('UPDATE_CONFIGURATION', message => { //update cycle
        //dispatcher pour eguiller vers cycle/sensor/trigger/schedule/
        const data = JSON.parse(message)
        if (data.cycle) {
            console.log("cycle from box",data.sensor);
            dispatch({
                type: CYCLE_SAVE,
                payload: data.cycle
            });
        }

        if (data.sensor) {
            console.log("sesor from box",data.sensor);
            dispatch({
                type: SENSOR_SAVE,
                payload: data.sensor
            });
        }

        // if (data.schedule) {
        //     dispatch({
        //         type: SCHEDULE_UPDATE,
        //         payload: data.sensor
        //     });
        // }

        // if (data.trigger) {
        //     dispatch({
        //         type: TRIGGER_UPDATE,
        //         payload: data.sensor
        //     });
        // }
    });

    authenticationService.socket?.on('front/synchronize/status', message => {
        console.log("test enter",message)
        dispatch({
            type: CYCLE_STATUS,
            payload: JSON.parse(message)
        });
    });

    authenticationService.socket?.on('front/synchronize/sensor-value', message => {
        if(message){
            
        }
        dispatch({
            type: SENSOR_STATUS,
            payload: JSON.parse(message),
        });
    });

    authenticationService.socket?.on('server/front/box-status', message => {
        const res = JSON.parse(message).data === 'connected';
        dispatch({
            type: SET_BOX_CONNECTED,
            payload: res
        });
    });

};

export const loadConfiguration = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.emit('front/box/fetch/configuration', {}, (response: any) => { 
        dispatch({
            type: CYCLES_LOAD,
            payload: JSON.parse(response.config).cycles,
        });

        dispatch({
            type: SENSORS_LOAD,
            payload: JSON.parse(response.config).sensors,
        });
    });
};