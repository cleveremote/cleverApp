import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import MasterDeviceSettingsScreen from '../screens/devices/master/MasterDeviceSettingsScreen';
import MasterGeneralSettingsSection from '../screens/devices/master/MasterGeneralSettingsSection';
import SlaveDevicesSection from '../screens/devices/master/SlaveDevicesSection';
import {SlaveDeviceSettingsStack} from './SlaveDeviceSettingsStack';

export function MasterDeviceSettingsStack() {
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'}
		} as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="MasterDeviceSettingsMenu"
				component={MasterDeviceSettingsScreen}
				options={options('Master Device')}
			/>
			<Stack.Screen
				name="MasterGeneralSection"
				component={MasterGeneralSettingsSection}
				options={options('General')}
			/>
			<Stack.Screen
				name="SlaveDevicesSection"
				component={SlaveDevicesSection}
				options={options('Slave Devices')}
			/>
			<Stack.Screen
				name="SlaveDeviceSettingsStack"
				component={SlaveDeviceSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default MasterDeviceSettingsStack;
