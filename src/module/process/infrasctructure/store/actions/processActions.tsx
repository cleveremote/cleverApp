import IO from 'socket.io-client';

/** misc */

/** Actions */
import { CONFIGURATION_LOAD, UPDATE_STATUS } from './types';
import { WEBSITE_URL } from '../../../../../../config/websocket';
import { TestService } from '../../../domain/services/test.service';

/** socket configurations */
const socket = IO(`${WEBSITE_URL}`, {
    forceNew: true,
});
socket.on('connection', () => console.log('Connection'));

export const listenerEvents = () => async dispatch => {
    socket.on('UPDATE_CONFIGURATION', message => {
        dispatch({
            type: CONFIGURATION_LOAD,
            payload: message,
        });
    });

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
                console.log(response.config);
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

export const syncConfiguration =
    ({ data }) =>
        async dispatch => {
            socket.emit('agg/synchronize/configuration', { data }, response => {
                console.log(response.config);
            });
        };
