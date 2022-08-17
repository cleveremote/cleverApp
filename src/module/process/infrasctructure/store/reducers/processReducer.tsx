import { dispatchto, getProcesses, TestService, updateConfiguration, updateCycles, updateSequenceConfiguration } from '../../../domain/services/test.service';
import {
    CONFIGURATION_LOAD,
    CYCLE_LOAD,
    CONFIGURATION_SYNC,
    UPDATE_CONFIGURATION,
    UPDATE_STATUS,
    SEQUENCE_SAVE,
    SAVE_CYCLE,
    MODULE_SAVE,
    CLOSE_MENU
} from '../actions/types';

const initialState = {
    messages: [],
    activeUsers: 0,
    errormsg: '',
    currentUser: null,
    configuration: null,
    cycles: null,
};


export default (state = initialState, action) => {
    switch (action.type) {
        case CONFIGURATION_LOAD:
        case UPDATE_CONFIGURATION:
        case CYCLE_LOAD:
        case SAVE_CYCLE:
            return {
                ...state,
                cycles: dispatchto(state.cycles, action.payload),
            };
        case SEQUENCE_SAVE: {
            return {
                ...state,
                sequence: updateSequenceConfiguration(action.payload)
            };
        }
        case CLOSE_MENU: {
            return {
                ...state,
                closeAll: action.payload
            };
        }

        case MODULE_SAVE: {
            return {
                ...state,
                module: updateSequenceConfiguration(action.payload),
            };
        }
        case UPDATE_STATUS:
            return {
                ...state,
                configuration: updateConfiguration(state.configuration, action.payload),
            };
        case CONFIGURATION_SYNC:
            return {
                ...state,
                configuration: action.payload.test,
            };
        default:
            return state;
    }
};
