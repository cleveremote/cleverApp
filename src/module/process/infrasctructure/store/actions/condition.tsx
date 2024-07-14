
import {
    CONDITION_UPDATE,
    CONDITIONS_LOAD,
    CONDITION_LOAD,
    CONDITION_SAVE
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';

export const updateCondition = (condition: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CONDITION_UPDATE,
        payload: condition,
    });
}

export const loadConditions = (conditionId: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CONDITIONS_LOAD,
        payload: conditionId,
    });
}

export const loadCondition = (conditionId: string, triggerId: string): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: CONDITION_LOAD,
        payload: { conditionId, triggerId },
    });
}

export const saveCondition = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    dispatch({
        type: CONDITION_SAVE,
        payload: data,
    });
};