
import {
    CYCLES_LOAD,
    CYCLE_UPDATE,
    CYCLE_LOAD,
    CYCLE_SAVE,
    CYCLE_STATUS,
    CYCLE_EXECUTE
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { authenticationService } from '../../../../authentication/domain/services/auth.service';


export const listenerEvents = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.on('UPDATE_CONFIGURATION', message => {
       dispatch({
            type: CYCLE_SAVE,
            payload: JSON.parse(message).cycle
        });
    });

    // authenticationService.socket?.on('front/synchronize/status', message => {
    //     dispatch({
    //         type: CYCLE_STATUS,
    //         payload: JSON.parse(message)
    //     });
    // });
};


export const updateCycle = (cycle: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CYCLE_UPDATE,
        payload: cycle,
    });
}

export const loadCycles = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.emit('front/box/fetch/configuration', {}, (response: any) => {
        dispatch({
            type: CYCLES_LOAD,
            payload: JSON.parse(response.config).cycles,
        });
    });
};

export const loadCycle = (cycleId: string): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CYCLE_LOAD,
        payload: cycleId
    });
}

export const saveCycle = (data: any, soft = false): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    if (soft) {
        dispatch({
            type: CYCLE_SAVE,
            payload: data,
        });
    } else {
        authenticationService.socket?.emit('front/box/sync/cycle', data, (response: any) => {
            dispatch({
                type: CYCLE_SAVE,
                payload: JSON.parse(response.config).cycle,
            });
        });
    }
};

export const executeCycle = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    return new Promise((resolve, reject) => {
        if (!authenticationService.socket?.connected) {
            reject(new Error("No server connexion!"));
        }

        authenticationService.socket?.emit('front/box/execute/process', data, (response: any) => {
            // if (response) {
            //     dispatch({
            //         type: CYCLE_EXECUTE,
            //         payload: response.config,
            //     });
            // }
            resolve(response);
        });
    })
};