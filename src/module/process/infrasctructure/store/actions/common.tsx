
import { SENSOR_UPDATE, CYCLE_UPDATE, SET_BOX_CONNECTED, CYCLE_STATUS, SENSOR_STATUS, CYCLES_LOAD, SENSORS_LOAD, CYCLE_SAVE, SENSOR_SAVE, PLAN_LOAD } from './types';
import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { authenticationService } from '../../../../authentication/domain/services/auth.service';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


export const listenerEvents = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.off('UPDATE_CONFIGURATION');
    authenticationService.socket?.off('front/synchronize/status');
    authenticationService.socket?.off('front/synchronize/sensor-value');
    authenticationService.socket?.off('server/front/box-status');
    setTimeout(() => {
        authenticationService.socket?.on('UPDATE_CONFIGURATION', message => {
            const data = JSON.parse(message)
            if (data.cycle) {
                dispatch({
                    type: CYCLE_SAVE,
                    payload: data.cycle
                });
            }

            if (data.sensor) {
                dispatch({
                    type: SENSOR_SAVE,
                    payload: data.sensor
                });
            }
        });

        authenticationService.socket?.on('front/synchronize/status', message => {
            const data = JSON.parse(message);
            dispatch({
                type: CYCLE_STATUS,
                payload: data
            });
        });

        authenticationService.socket?.on('front/synchronize/sensor-value', message => {
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

    }, 1000);


};

// export const loadPlan = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
//     authenticationService.socket?.emit('front/box/fetch/configuration', {plan:123}, (response: any) => {
//         dispatch({
//             type: PLAN_LOAD,
//             payload: response.config,
//         });
//     });
// };

export const loadPlan = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    const plan = await AsyncStorage.getItem('test_plan');
    if(!plan){
        authenticationService.socket?.emit('front/box/fetch/configuration', {plan:123}, async (response: any) => {
            await AsyncStorage.setItem('test_plan', response.config);
            dispatch({
                type: PLAN_LOAD,
                payload: response.config,
            });
        });
    } else { 
        dispatch({
            type: PLAN_LOAD,
            payload: plan,
        });
    }
   
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

        dispatch({
            type: SENSOR_STATUS,
            payload: JSON.parse(response.config).values,
        });
    });
};