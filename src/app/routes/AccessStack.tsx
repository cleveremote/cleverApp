import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeBaseProvider } from "native-base";
import { ProfilesScreen } from "../screens/access/loading";
import { DeviceSettings } from "../screens/access/deviceSettings";
import SignIn from "../screens/access/SignIn";
import messaging from '@react-native-firebase/messaging';
import { DeviceScreen } from "../screens/access/device";
export function AccessStack() {

    useEffect(() => {
        const devices = async () => {
            //// FCM google
            await messaging().registerDeviceForRemoteMessages();
            const token = await messaging().getToken();
        }
        devices();
    }, []);

    const Stack = createNativeStackNavigator();
    return (
        <NativeBaseProvider>
            <Stack.Navigator>
                <Stack.Screen name="Profiles" options={{ headerShown: false }} component={ProfilesScreen} />
                <Stack.Screen name="Device" options={{ headerShown: true, title: 'Device(s) found' }} component={DeviceScreen} />
                <Stack.Screen name="deviceSettings" options={{ headerShown: true, title: 'Device setting' }} component={DeviceSettings} />
                <Stack.Screen name="Signin" options={{ headerShown: false }} component={SignIn} />
            </Stack.Navigator> 
        </NativeBaseProvider>
    )
}
