import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import ActuatorsScreen from '../screens/actuators/ActuatorsScreen';
import {ActuatorSettingsStack} from './ActuatorSettingsStack';

export function ActuatorsStack() {
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
				name="Actuators"
				component={ActuatorsScreen}
				options={options('Actuators')}
			/>
			<Stack.Screen
				name="ActuatorSettingsStack"
				component={ActuatorSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default ActuatorsStack;
