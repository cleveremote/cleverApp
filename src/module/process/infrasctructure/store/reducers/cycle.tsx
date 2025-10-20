
import {
    CYCLE_SAVE,
    CYCLES_LOAD,
    CYCLE_UPDATE,
    CYCLE_LOAD,
    CYCLE_STATUS,
    CYCLE_EXECUTE,
    DATA_LOAD,
    RESET_STORE
} from '../actions/types';
import { loadCycle, loadCycles, updateCycle, updateStatus } from './cycle-reducer-helper';

const initialState = {
    cycles: [],
    cycle: undefined,
    status: [],
    isLoading: false,
    data:[]

};


export default (state = initialState, action: any) => {
    switch (action.type) {
        case RESET_STORE:
            return {
                ...state,
                cycles: initialState.cycles
            };
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
            const data = Array.isArray(action.payload) ? action.payload : [action.payload];
            return {
                ...state,
                status: updateStatus(state.status, data)
            };
        }

        case DATA_LOAD: {
            return {
                ...state,
                data: action.payload
            };
        }



        case CYCLE_EXECUTE: {
            return {
                ...state,
                isLoading: action.payload
            };
        }



        default:
            return state;
    }
};
