
import {
    MODULE_UPDATE,
    MODULES_LOAD
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';

export const updateModule = (module: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: MODULE_UPDATE,
        payload: module,
    });
}

export const loadModules = (sequence: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: MODULES_LOAD,
        payload: sequence,
    });
}