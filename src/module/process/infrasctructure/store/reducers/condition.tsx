
import {
    CONDITIONS_LOAD,
    CONDITION_LOAD,
    CONDITION_UPDATE,
    CONDITION_SAVE
} from '../actions/types';
import { loadCondition, loadConditions, updateCondition } from './condition-reducer-helper';

const initialState = {
    conditions: [],
    condition: undefined,

};


export default (state = initialState, action: any) => {
    switch (action.type) {

        case CONDITIONS_LOAD: {
            return {
                ...state,
                conditions: loadConditions(action.payload)
            };
        }

        case CONDITION_LOAD: {
            return {
                ...state,
                condition: loadCondition(state.conditions, action.payload.conditionId, action.payload.triggerId)
            };
        }

        case CONDITION_UPDATE: {

            return {
                ...state,
                condition: action.payload
            };
        }

        case CONDITION_SAVE: {
            return {
                ...state,
                conditions: updateCondition(state.conditions, action.payload)
            };
        }

        default:
            return state;
    }
};
