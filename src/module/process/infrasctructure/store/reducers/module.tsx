
import {
    MODULES_LOAD,
    MODULE_UPDATE
} from '../actions/types';
import { loadModules, updateModule } from './module-reducer-helper';

const initialState = {
    modules: [],

};

export default (state = initialState, action: any) => {
    switch (action.type) {
        case MODULES_LOAD: {
            return {
                ...state,
                modules: loadModules(action.payload)
            };
        }
        case MODULE_UPDATE:
            return {
                ...state,
                modules: updateModule(state.modules, action.payload)
            };
        default:
            return state;
    }
};
