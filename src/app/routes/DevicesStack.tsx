import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import DevicesScreen from '../screens/devices/DevicesScreen';
import {MasterDeviceSettingsStack} from './MasterDeviceSettingsStack';

export function DevicesStack() {
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			animation: 'none',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'}
		} as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="Devices"
				component={DevicesScreen}
				options={options('Devices')}
			/>
			<Stack.Screen
				name="MasterDeviceSettingsStack"
				component={MasterDeviceSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default DevicesStack;
