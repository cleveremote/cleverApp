
import {
    SEQUENCE_UPDATE,
    SEQUENCES_LOAD,
    SEQUENCE_LOAD,
    SEQUENCE_SAVE,
    SEQUENCE_ORDER
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';

export const updateSequence = (sequence: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SEQUENCE_UPDATE,
        payload: sequence,
    });
}

export const loadSequences = (sequenceId: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SEQUENCES_LOAD,
        payload: sequenceId,
    });
}

export const loadSequence = (sequenceId: string,): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SEQUENCE_LOAD,
        payload: sequenceId,
    });
}

export const updateSequencesOder = (sequences: any[]): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SEQUENCE_ORDER,
        payload: sequences,
    });
}

export const saveSequence = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    dispatch({
        type: SEQUENCE_SAVE,
        payload: data,
    });
};