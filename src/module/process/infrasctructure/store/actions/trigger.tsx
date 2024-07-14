
import {
    TRIGGERS_LOAD,
    TRIGGER_UPDATE,
    TRIGGER_LOAD,
    TRIGGER_SAVE
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { authenticationService } from '../../../../authentication/domain/services/auth.service';

export const updateTrigger = (trigger: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: TRIGGER_UPDATE,
        payload: trigger,
    });
}

export const loadTriggers = (triggerId: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: TRIGGERS_LOAD,
        payload: triggerId,
    });
}

export const loadTrigger = (triggerId: string, cycleId: string): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    console.log("{ triggerId, cycleId }",{ triggerId, cycleId })
    dispatch({
        type: TRIGGER_LOAD,
        payload: { triggerId, cycleId },
    });
}

export const saveTrigger = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.emit('front/box/sync/trigger', data, (response: any) => {
        dispatch({
            type: TRIGGER_SAVE,
            payload: response.config,
        });
    });
};