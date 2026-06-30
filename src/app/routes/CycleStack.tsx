import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import CycleScreen from '../screens/cycle/CyclesScreen';
import EventsScreen from '../screens/cycle/events/events';
import {SettingsScreen} from '../screens/settings/settings';

import {CycleSettingStack} from './CycleSettingsStack';
import {TriggersStack} from './TriggersStack';
import {SchedulesStack} from './SchedulesStack';

export function CycleStack({typeFilter}: {typeFilter?: string} = {}) {
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
				name="Cycles"
				component={CycleScreen}
				options={options(typeFilter==="MODULE" ? 'Modules' : (typeFilter==='FERTIGATION' ? 'Fertigation' : 'Cycles'))}
				initialParams={{typeFilter}}
			/>
			<Stack.Screen
				name="Settings"
				component={CycleSettingStack}
				options={{headerShown: false}}
			/>
			<Stack.Screen
				name="TriggersStack"
				component={TriggersStack}
				options={{headerShown: false}}
			/>
			<Stack.Screen
				name="SchedulesStack"
				component={SchedulesStack}
				options={{headerShown: false}}
			/>
			<Stack.Screen
				name="EventsScreen"
				component={EventsScreen}
				options={options('Event log')}
			/>
			<Stack.Screen
				name="SettingsScreen"
				component={SettingsScreen}
				options={options('Settings')}
			/>
		</Stack.Navigator>
	);
}
