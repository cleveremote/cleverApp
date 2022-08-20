import IO from 'socket.io-client';

/** misc */

/** Actions */
import { CONFIGURATION_LOAD, UPDATE_STATUS, CYCLE_LOAD, SEQUENCE_SAVE, CYCLE_SAVE, MODULE_SAVE, CLOSE_MENU, PROCESS_EXECUTE, CYCLE_EXEC } from './types';
import { WEBSITE_URL } from '../../../../../../config/websocket';
import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';

/** socket configurations */
const socket = IO(`${WEBSITE_URL}`, {
    forceNew: true,
});
socket.on('connection', () => null);

export const listenerEvents = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    socket.on('UPDATE_CONFIGURATION', message => {
        dispatch({
            type: CONFIGURATION_LOAD,
            payload: message,
        });
    });

    socket.on('front/synchronize/status', message => {
        dispatch({
            type: UPDATE_STATUS,
            payload: message,
        });
    });

   

    
};


export const executeProcess = (id: string, duration: number): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    socket.emit('execute', { id, duration }, (response: any) => {
        dispatch({
            type: PROCESS_EXECUTE,
            payload: response.config,
        });
    });
};

export const executePartialSync = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    socket.emit('agg/synchronize/configuration-partial', data, (response: any) => {
        dispatch({
            type: CONFIGURATION_LOAD,
            payload: response.config,
        });
    });
};

export const executeCycle = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    socket.emit('agg/execution/process', data, (response: any) => {
        dispatch({
            type: CYCLE_EXEC,
            payload: response.config,
        });
    });
};

export const loadConfiguration = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    socket.emit('agg/fetch/configuration', {}, (response: any) => { //any struct element cycles ...
        dispatch({
            type: CONFIGURATION_LOAD,
            payload: response.config,
        });
    });
};

export const loadCycle = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    socket.emit('agg/fetch/configuration', {}, (response: any) => {
        dispatch({
            type: CYCLE_LOAD,
            payload: response.config,
        });
    });
};

export const updateSequence = (sequence: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SEQUENCE_SAVE,
        payload: sequence,
    });
}

export const updateModule = (sequence: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: MODULE_SAVE,
        payload: sequence,
    });
}

export const saveCycle = (sequence: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CYCLE_SAVE,
        payload: sequence,
    });
}

export const closeMenus = (exept: string): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CLOSE_MENU,
        payload: exept,
    });
}