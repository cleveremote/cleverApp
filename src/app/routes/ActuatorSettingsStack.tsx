import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import ActuatorSettingsScreen from '../screens/actuators/ActuatorSettingsScreen';
import ActuatorGeneralSettingsSection from '../screens/actuators/ActuatorGeneralSettingsSection';
import ActuatorConfigurationSettingsSection from '../screens/actuators/ActuatorConfigurationSettingsSection';

export function ActuatorSettingsStack() {
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
				name="ActuatorSettingsMenu"
				component={ActuatorSettingsScreen}
				options={options('Actuator')}
			/>
			<Stack.Screen
				name="ActuatorGeneralSection"
				component={ActuatorGeneralSettingsSection}
				options={options('General')}
			/>
			<Stack.Screen
				name="ActuatorConfigurationSection"
				component={ActuatorConfigurationSettingsSection}
				options={options('Configuration')}
			/>
		</Stack.Navigator>
	);
}

export default ActuatorSettingsStack;
