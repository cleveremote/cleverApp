import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import ComRequestSettingsScreen from '../screens/devices/comrequest/ComRequestSettingsScreen';
import ComRequestGeneralSettingsSection from '../screens/devices/comrequest/ComRequestGeneralSettingsSection';
import ComRequestConfigurationSettingsSection from '../screens/devices/comrequest/ComRequestConfigurationSettingsSection';

export function ComRequestSettingsStack() {
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
				name="ComRequestSettingsMenu"
				component={ComRequestSettingsScreen}
				options={options('COM Request')}
			/>
			<Stack.Screen
				name="ComRequestGeneralSection"
				component={ComRequestGeneralSettingsSection}
				options={options('General')}
			/>
			<Stack.Screen
				name="ComRequestConfigurationSection"
				component={ComRequestConfigurationSettingsSection}
				options={options('Configuration')}
			/>
		</Stack.Navigator>
	);
}

export default ComRequestSettingsStack;
