
import { authenticationService } from '../../../../authentication/domain/services/auth.service';
import { saveSigninData } from '../../../../../app/components/common/RememberMeManager';
import { SET_BOX_CONNECTED, SET_CONNECTED, SET_SERVER_CONNECTED } from './types';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../store';
import { AnyAction } from 'redux';


export const login = (user: string, password: string, rememberCredentials: boolean, newProfile: string, profile: string): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
    const res = await authenticationService.Login(user, password);
    if (res.res) {
        await saveSigninData(newProfile, user, password, rememberCredentials, profile);
        dispatch({
            type: SET_BOX_CONNECTED,
            payload: true
        });
        dispatch({
            type: SET_SERVER_CONNECTED,
            payload: true
        });
        dispatch({
            type: SET_CONNECTED,
            payload: true,
        });
    } else {
        return res;
    }
};

export const setIsConnected = (value: boolean): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SET_CONNECTED,
        payload: value,
    });
};

export const setIsBoxConnected = (value: boolean): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SET_BOX_CONNECTED,
        payload: value,
    });
};

export const setIsServerConnected = (value: boolean): ThunkAction<void, RootState, unknown, AnyAction> => dispatch => {
    dispatch({
        type: SET_SERVER_CONNECTED,
        payload: value,
    });
};
