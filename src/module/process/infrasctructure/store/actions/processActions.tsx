import IO from 'socket.io-client';

/** misc */

/** Actions */
import { CONFIGURATION_LOAD, UPDATE_STATUS, CYCLE_LOAD, SEQUENCE_SAVE, CYCLE_SAVE, MODULE_SAVE,CLOSE_MENU } from './types';
import { WEBSITE_URL } from '../../../../../../config/websocket';
import { TestService } from '../../../domain/services/test.service';

/** socket configurations */
const socket = IO(`${WEBSITE_URL}`, {
    forceNew: true,
});
socket.on('connection', () => null);

export const listenerEvents = () => async dispatch => {
    socket.on('UPDATE_CONFIGURATION', message => {
        dispatch({
            type: CONFIGURATION_LOAD,
            payload: message,
        });
    }



    );

    socket.on('agg/synchronize/status', message => {
        dispatch({
            type: UPDATE_STATUS,
            payload: message,
        });
    });
};


export const executeProcess =
    ({ id, duration }) =>
        async dispatch => {
            socket.emit('execute', { id, duration }, response => {
                //console.log(response.config);
            });
        };

export const executePartialSync =
    (data) =>
        async dispatch => {
            socket.emit('agg/synchronize/configuration-partial', data, response => {
                console.log('response configuration-partial', response.status);
            });
        };

export const loadConfiguration = () => async dispatch => {
    socket.emit('agg/fetch/configuration', {}, response => {
        dispatch({
            type: CONFIGURATION_LOAD,
            payload: response.config,
        });
    });
};

export const loadCycle = () => async dispatch => {
    socket.emit('agg/fetch/configuration', {}, response => {
        dispatch({
            type: CYCLE_LOAD,
            payload: response.config,
        });
    });
};

export const updateSequence = (sequence) => dispatch => {
    dispatch({
        type: SEQUENCE_SAVE,
        payload: sequence,
    });
}

export const updateModule = (sequence) => dispatch => {
    dispatch({
        type: MODULE_SAVE,
        payload: sequence,
    });
}
export const saveCycle = (sequence) => dispatch => {
    dispatch({
        type: CYCLE_SAVE,
        payload: sequence,
    });
}

export const closeMenus = (exept) => dispatch => {
    dispatch({
        type: CLOSE_MENU,
        payload: exept,
    });
}



export const syncConfiguration =
    ({ data }) =>
        async dispatch => {
            socket.emit('agg/synchronize/configuration', { data }, response => {
                //console.log(response.config);
            });
        };
