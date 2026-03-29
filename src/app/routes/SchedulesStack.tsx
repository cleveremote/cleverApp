import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import SchedulesScreen from '../screens/cycle/schedules/SchedulesScreen';
import {ScheduleSettingsStack} from './ScheduleSettingsStack';

export function SchedulesStack() {
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
				name="Schedules"
				component={SchedulesScreen}
				options={options('Schedules')}
			/>
			<Stack.Screen
				name="ScheduleSettingsStack"
				component={ScheduleSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}
