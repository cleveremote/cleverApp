import {configureStore, applyMiddleware} from '@reduxjs/toolkit';
import thunk from 'redux-thunk';

const middleware = [thunk];
const initialState = {};

import rootReducer from './reducers';

const store = configureStore(
  {reducer:rootReducer},
  initialState,
  applyMiddleware(...middleware),
);

export default store;
