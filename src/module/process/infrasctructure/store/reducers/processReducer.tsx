import { dispatchto, executeCycle, updateConfiguration, updateSequenceConfiguration, updateStatus } from '../../../domain/services/test.service';
import {
    CONFIGURATION_LOAD,
    CYCLE_LOAD,
    CONFIGURATION_SYNC,
    UPDATE_CONFIGURATION,
    UPDATE_STATUS,
    SEQUENCE_SAVE,
    MODULE_SAVE,
    CYCLE_EXEC
} from '../actions/types';

const initialState = {
    messages: [],
    activeUsers: 0,
    errormsg: '',
    currentUser: null,
    configuration: null,
    cycles: null,
    closeAll:false
};


export default (state = initialState, action: any) => {
    switch (action.type) {
        case CONFIGURATION_LOAD:
        case UPDATE_CONFIGURATION:
        case CYCLE_LOAD:
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

        case MODULE_SAVE: {
            return {
                ...state,
                module: updateSequenceConfiguration(action.payload),
            };
        }

      
        case UPDATE_STATUS:
            return {
                ...state,
                cycles: updateStatus(state.cycles, action.payload),
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
