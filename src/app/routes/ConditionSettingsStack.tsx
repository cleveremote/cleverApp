import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import ConditionParamSettingsSection from '../screens/cycle/conditions/ConditionParamSettingsSection';
import ConditionGeneralSettingsSection from '../screens/cycle/conditions/ConditionGeneralSettingsSection';
import ConditionSettingsScreen from '../screens/cycle/conditions/ConditionSettingsScreen';

export function ConditionSettingsStack() {
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
				name="ConditionSettingsScreen"
				component={ConditionSettingsScreen}
				options={options('Condition settings')}
			/>
			<Stack.Screen
				name="ConditionGeneralSettingsSection"
				component={ConditionGeneralSettingsSection}
				options={options('General')}
			/>
			<Stack.Screen
				name="ConditionParamSettingsSection"
				component={ConditionParamSettingsSection}
				options={options('Parameters')}
			/>
		</Stack.Navigator>
	);
}
