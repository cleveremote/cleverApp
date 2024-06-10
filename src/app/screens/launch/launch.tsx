import React, { Component } from 'react';
import { NativeBaseProvider, View } from 'native-base';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthVerify } from '../../components/common/AuthVerify';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoadingScreen } from '../../components/access/loading';
import { SignIn } from '../../components/access/signin';
import messaging from '@react-native-firebase/messaging';
import Clv from '../clv/clv';
import hydrophyto from '../../../../hydrophyto.svg';
import { SvgUri } from 'react-native-svg';
import { DeviceScreen } from '../../components/access/device';
import Logo from "../../../../hydrophyto.svg";
import { DeviceSettings } from '../../components/access/deviceSettings';

type MyProps = { navigation: any };

type MyState = {};

class Launch extends Component<MyProps, MyState> {
    constructor(props: MyProps) {
        super(props);

        this.state = {

        };
    }

    public async componentDidMount() {
        // Register the device with FCM
        await messaging().registerDeviceForRemoteMessages();
        console.log('prepare get token');
        // Get the token
        const token = await messaging().getToken();
        console.log('the token1 : ', token);
    }

    public headerLeftCycleSettingsScreen() {
        const _t = this;
        return (
            <View marginBottom={150}>
                <Logo width={"35"} height={"35"} />
            </View>

        );
    }

    render() {
        const Stack = createNativeStackNavigator();
        return (
            <NativeBaseProvider>
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen name="Loading" options={{ headerShown: false }} component={LoadingScreen} />
                        <Stack.Screen name="Device" options={{ headerShown: true, title: 'Device(s) found' }} component={DeviceScreen} />
                        <Stack.Screen name="deviceSettings" options={{ headerShown: true, title: 'Device setting' }} component={DeviceSettings} />
                        <Stack.Screen name="Signin" options={{ headerShown: false }} component={SignIn} />
                        <Stack.Screen name="Clv" options={{ headerShown: false }} component={Clv} />
                    </Stack.Navigator>
                </NavigationContainer>
            </NativeBaseProvider>
        );
    }

    componentWillUnmount() {
    }

}

export default Launch;

