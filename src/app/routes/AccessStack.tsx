import React, {useEffect} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {ProfilesScreen} from '../screens/access/loading';
import {DeviceSettings} from '../screens/access/deviceSettings';
import SignIn from '../screens/access/SignIn';
import messaging from '@react-native-firebase/messaging';
import {DeviceScreen} from '../screens/access/device';
import {ScanBoxScreen} from '../screens/access/scanBox';
import {BoxConfiguration} from '../screens/access/boxConfiguration';
import {BoxHandover} from '../screens/access/boxHandover';
export function AccessStack() {
	useEffect(() => {
		const devices = async () => {
			//// FCM google
			await messaging().registerDeviceForRemoteMessages();
			const token = await messaging().getToken();
		};
		devices();
	}, []);

	const Stack = createStackNavigator();
	return (
		<>
			<Stack.Navigator screenOptions={{
    headerLeft: () => null, // reset global
  }}>
				<Stack.Screen
					name="Profiles"
					options={{headerShown: false}}
					component={ProfilesScreen}
				/>
				<Stack.Screen
					name="ScanBox"
					options={{headerShown: true, title: 'Scanner la box'}}
					component={ScanBoxScreen}
				/>
				<Stack.Screen
					name="Device"
					options={{headerShown: true, title: 'Device(s) found'}}
					component={DeviceScreen}
				/>
				<Stack.Screen
					name="deviceSettings"
					options={{headerShown: true, title: 'Configure connexion'}}
					component={DeviceSettings}
				/>
				<Stack.Screen
					name="BoxConfiguration"
					options={{headerShown: true, title: 'Configurer la box'}}
					component={BoxConfiguration}
				/>
				<Stack.Screen
					name="BoxHandover"
					options={{
						headerShown: true,
						title: 'Connexion de la box',
						// Le geste de retour ramènerait au formulaire, qui n'a
						// plus de réseau : la sortie passe par l'en-tête.
						gestureEnabled: false
					}}
					component={BoxHandover}
				/>
				<Stack.Screen
					name="Signin"
					options={{headerShown: true, title: 'Sign in',headerStyle: {backgroundColor: 'white'}}}
					component={SignIn}
				/>
			</Stack.Navigator>
		</>
	);
}
