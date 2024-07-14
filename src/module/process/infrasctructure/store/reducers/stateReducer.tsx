import { SET_BOX_CONNECTED, SET_CONNECTED, SET_SERVER_CONNECTED } from "../actions/types";

const initialState = {
    user: {},
    isConnected: false,
    isBoxConnected: false,
    isServerConnected: false
};

export default (state = initialState, action: any) => {
    switch (action.type) {
        case SET_BOX_CONNECTED:
            return {
                ...state,
                isBoxConnected: action.payload
            };
        case SET_SERVER_CONNECTED:
            return {
                ...state,
                isServerConnected: action.payload
            };
        case SET_CONNECTED:
            return {
                ...state,
                isConnected: action.payload
            };
        default:
            return state;
    }
}
