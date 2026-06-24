import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import CycleScreen from '../screens/cycle/CyclesScreen';
import EventsScreen from '../screens/cycle/events/events';

import {CycleSettingStack} from './CycleSettingsStack';
import {TriggersStack} from './TriggersStack';
import {SchedulesStack} from './SchedulesStack';
import PlanScreen from '../screens/plan/PlanScreen';

export function PlanStack() {
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			animation: 'none',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'},
			headerShown: false
		} as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="Plan"
				component={PlanScreen}
				options={options('Plan')}
			/>
		</Stack.Navigator>
	);
}
