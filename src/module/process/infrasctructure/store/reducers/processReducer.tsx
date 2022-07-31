import { getProcesses, TestService, updateConfiguration } from '../../../domain/services/test.service';
import {
    CONFIGURATION_LOAD,
    CONFIGURATION_SYNC,
    UPDATE_CONFIGURATION,
    UPDATE_STATUS
} from '../actions/types';

const initialState = {
    messages: [],
    activeUsers: 0,
    errormsg: '',
    currentUser: null,
    configuration: null
};


export default (state = initialState, action) => {
    switch (action.type) {
        case CONFIGURATION_LOAD:
        case UPDATE_CONFIGURATION:
            return {
                ...state,
                configuration: getProcesses(action.payload),
            };
        case UPDATE_STATUS:
            return {
                ...state,
                configuration: updateConfiguration(state.configuration,action.payload),
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
