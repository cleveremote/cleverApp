
import {
    SCHEDULES_LOAD,
    SCHEDULE_UPDATE,
    SCHEDULE_LOAD,
    SCHEDULE_SAVE
} from './types';

import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { RootState } from '../store';
import { authenticationService } from '../../../../authentication/domain/services/auth.service';

export const updateSchedule = (schedule: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SCHEDULE_UPDATE,
        payload: schedule,
    });
}

export const loadSchedules = (scheduleId: any): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SCHEDULES_LOAD,
        payload: scheduleId,
    });
}

export const loadSchedule = (scheduleId: string, cycleId: string): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SCHEDULE_LOAD,
        payload: { scheduleId, cycleId },
    });
}

export const saveSchedule = (data: any): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    authenticationService.socket?.emit('front/box/sync/schedule', data, (response: any) => {
        console.log("response.config",response.config);
        dispatch({
            type: SCHEDULE_SAVE,
            payload: response.config
        });
    });
};