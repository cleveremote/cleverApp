import { Types } from './types';
import { authenticationService } from '../../domain/services/auth.service';
import { saveSigninData } from '../../../../app/components/common/RememberMeManager';

//Login User
export const login = (user: string, password: string, rememberCredentials: boolean, newProfile: string, profile: string) => async dispatch => {
    const res = await authenticationService.Login(user, password);
    if (res.res) {
        await saveSigninData(newProfile, user, password, rememberCredentials, profile);
        dispatch(toggleIsLoggedIn(true));
    } else {
        return res;
    }

}

//Set isLoggedIn state value
export const setIsLoggedIn = value => dispatch => {
    dispatch(toggleIsLoggedIn(value));
};

const getLoginSuccess = data => ({
    type: Types.LOGIN_SUCCESS,
    payload: data,
});

//Set isLoggedIn state value
const toggleIsLoggedIn = value => ({
    type: Types.TOGGLE_LOGIN,
    payload: value,
});
