import React from 'react';
import {
	NativeStackNavigationOptions,
	createNativeStackNavigator
} from '@react-navigation/native-stack';
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
			orientation: 'landscape',
			animation: 'none',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'},
			headerShown: false
		} as NativeStackNavigationOptions);
	const Stack = createNativeStackNavigator();
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
