import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import SlaveDeviceSettingsScreen from '../screens/devices/slave/SlaveDeviceSettingsScreen';
import SlaveGeneralSettingsSection from '../screens/devices/slave/SlaveGeneralSettingsSection';
import SlaveConfigurationSettingsSection from '../screens/devices/slave/SlaveConfigurationSettingsSection';
import ComRequestsSection from '../screens/devices/slave/ComRequestsSection';
import {ComRequestSettingsStack} from './ComRequestSettingsStack';

export function SlaveDeviceSettingsStack() {
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
				name="SlaveDeviceSettingsMenu"
				component={SlaveDeviceSettingsScreen}
				options={options('Slave Device')}
			/>
			<Stack.Screen
				name="SlaveGeneralSection"
				component={SlaveGeneralSettingsSection}
				options={options('General')}
			/>
			<Stack.Screen
				name="SlaveConfigurationSection"
				component={SlaveConfigurationSettingsSection}
				options={options('Configuration')}
			/>
			<Stack.Screen
				name="ComRequestsSection"
				component={ComRequestsSection}
				options={options('COM Requests')}
			/>
			<Stack.Screen
				name="ComRequestSettingsStack"
				component={ComRequestSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default SlaveDeviceSettingsStack;
