import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const setCredentials = async (login: string, password: string) => {
  try {
    await Keychain.setGenericPassword(login, password, {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.ALWAYS,
      service: login
    });
    await AsyncStorage.setItem('boxId', login);
  } catch (error) {
    console.error('Error storing email for remembre me:', error);
  }
};

const getCredentials = async (account: string): Promise<Keychain.UserCredentials | null> => {
  try {
    return await Keychain.getGenericPassword({
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      accessible: Keychain.ACCESSIBLE.ALWAYS,
      service: account
    }) as Keychain.UserCredentials;
  } catch (error) {
    console.log("Keychain couldn't be accessed!", error);
  }
  return null;
};

const clearCredentials = async (account: string) => {
  try {
    await Keychain.resetGenericPassword({ service: account });
  } catch (error) {
    console.error('error resetGenericPassword', error);
  }
};

const setAssociationProfileAccount = async (profile: string, account: string, rememberCredentials: boolean) => {
  try {
    await AsyncStorage.setItem(profile, JSON.stringify({ account, rememberCredentials }));
  } catch (error) {
    console.error('Error setAssociationProfileAccount:', error);
  }
}

const getAssociationProfileAccount = async (profile: string): Promise<{ account: string, rememberCredentials: boolean } | null> => {
  try {
    const data = await AsyncStorage.getItem(profile);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getAssociationProfileAccount:', error);
  }
  return null;
}

const setIsRememberCredentials = async (value: boolean, account: string) => {
  try {
    if (!value) {
      await clearCredentials(account);
    }
    await AsyncStorage.setItem('checkStatus', value.toString());
  } catch (error) {
    console.error('Error setIsRememberCredentials:', error);
  }
};

const getIsRememberCredentials = async () => {
  try {
    return Boolean(await AsyncStorage.getItem('checkStatus'));
  } catch (error) {
    console.error('Error getIsRememberCredentials:', error);
    return false;
  }
};

const setProfiles = async (profile: string) => {
  try {
    const profilesStr = await AsyncStorage.getItem("profiles");
    const profiles = profilesStr?.split(',') || [];
    profiles.push(profile);
    await AsyncStorage.setItem("profiles", profiles.join(','));
  } catch (error) {
    console.error('Error getAssociationProfileAccount:', error);
  }
  return null;
}

const getAllProfiles = async () => {
  try {
    const profilesStr = await AsyncStorage.getItem("profiles");
    // const profilesStr = 'My test box, My test box bis';
    return profilesStr?.split(',') || [];
  } catch (error) {
    console.error('Error getAssociationProfileAccount:', error);
    return [];
  }
}

const getSigninData = async (profile: string) => {
  try {
    const data = await getAssociationProfileAccount(profile);
    if (data) {
      const credentials = await getCredentials(data.account);
      return { login: credentials?.username || "", password: credentials?.password || "", rememberCredentials: data.rememberCredentials, profile }
    }
  } catch (error) {
    console.error('Error getAssociationProfileAccount:', error);
  }
  return null;
}

const deleteProfile = async (profile: string) => {
  //remove assocition profile acount.
  await AsyncStorage.removeItem(profile);
  //remove profile from profiles list
  const profilesLst = await getAllProfiles();
  const index = profilesLst.findIndex((x) => x === profile);
  profilesLst.splice(index, 1);
  await AsyncStorage.setItem("profiles", profilesLst.join(','));
}

const saveSigninData = async (newProfile: string, account: string, password: string, rememberCredentials: boolean, profile: string): Promise<void> => {
  console.log(newProfile, account, password, rememberCredentials, profile)
  if (rememberCredentials) {
    const exists = await getAssociationProfileAccount(newProfile);
    if (profile) {
      await deleteProfile(profile);
    }
    await setProfiles(newProfile);
    await setAssociationProfileAccount(newProfile, account, rememberCredentials);
    await setCredentials(account, password);

  }
}


export {
  getSigninData,
  clearCredentials,
  getIsRememberCredentials,
  getCredentials,
  setIsRememberCredentials,
  setCredentials,
  setAssociationProfileAccount,
  getAssociationProfileAccount,
  getAllProfiles,
  setProfiles,
  saveSigninData,
  deleteProfile
};