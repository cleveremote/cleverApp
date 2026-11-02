import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import GroupsScreen from '../screens/cycle/GroupsScreen';
import EventsScreen from '../screens/cycle/events/events';
import {SettingsScreen} from '../screens/settings/settings';

import {CycleSettingStack} from './CycleSettingsStack';
import {TriggersStack} from './TriggersStack';
import {SchedulesStack} from './SchedulesStack';
import {MasterDeviceSettingsStack} from './MasterDeviceSettingsStack';

export function FertigationStack() {
	const {t} = useTranslation('navigation');
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
				component={GroupsScreen}
				options={options(t('fertigation'))}
			/>
			{/* Ouvert depuis l'icône « déconnecté » d'une carte : le retour
			    ramène ici plutôt que dans l'onglet Settings. */}
			<Stack.Screen
				name="DeviceSettings"
				component={MasterDeviceSettingsStack}
				options={{headerShown: false}}
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
				options={options(t('eventLog'))}
			/>
			<Stack.Screen
				name="SettingsScreen"
				component={SettingsScreen}
				options={options(t('settings'))}
			/>
		</Stack.Navigator>
	);
}
