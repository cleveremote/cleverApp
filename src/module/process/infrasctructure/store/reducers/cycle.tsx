
import {
    CYCLE_SAVE,
    CYCLES_LOAD,
    CYCLE_UPDATE,
    CYCLE_LOAD,
    CYCLE_STATUS
} from '../actions/types';
import { loadCycle, loadCycles, updateCycle, updateStatus } from './cycle-reducer-helper';

const initialState = {
    cycles: [],
    cycle: undefined,

};


export default (state = initialState, action: any) => {
    switch (action.type) {

        case CYCLES_LOAD: {
            return {
                ...state,
                cycles: loadCycles(action.payload)
            };
        }

        case CYCLE_LOAD: {
            return {
                ...state,
                cycle: loadCycle(state.cycles, action.payload)
            };
        }

        case CYCLE_UPDATE: {
            return {
                ...state,
                cycle: action.payload
            };
        }

        case CYCLE_SAVE: {
            return {
                ...state,
                cycles: updateCycle(state.cycles, action.payload)
            };
        }

        case CYCLE_STATUS: {
            return {
                ...state,
                cycles: updateStatus(state.cycles, action.payload)
            };
        }

        default:
            return state;
    }
};
