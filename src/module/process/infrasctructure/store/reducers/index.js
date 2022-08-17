import {combineReducers} from 'redux';
import processReducer from './processReducer';

export default combineReducers({
    configuration: processReducer
});
