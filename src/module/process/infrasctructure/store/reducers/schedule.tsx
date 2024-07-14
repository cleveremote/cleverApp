
import {

    SCHEDULE_SAVE,
    SCHEDULES_LOAD,
    SCHEDULE_UPDATE,
    SCHEDULE_LOAD
} from '../actions/types';
import { loadSchedule, loadSchedules, updateSchedule } from './schedule-reducer-helper';

const initialState = {
    schedules: [],
    schedule: undefined
};


export default (state = initialState, action: any) => {
    switch (action.type) {

        case SCHEDULES_LOAD: {
            return {
                ...state,
                schedules: loadSchedules(action.payload)
            };
        }

        case SCHEDULE_LOAD: {
            return {
                ...state,
                schedule: loadSchedule(state.schedules, action.payload.scheduleId, action.payload.cycleId)
            };
        }

        case SCHEDULE_UPDATE: {

            return {
                ...state,
                schedule: action.payload
            };
        }

        case SCHEDULE_SAVE: {
            return {
                ...state,
                schedules: updateSchedule(state.schedules, JSON.parse(action.payload).schedule)
            };
        }

        default:
            return state;
    }
};
