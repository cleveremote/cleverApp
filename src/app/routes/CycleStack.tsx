import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import CycleScreen from '../screens/cycle/CyclesScreen';
import CycleMenuScreen from '../screens/cycle/CycleMenuScreen';
import EventsScreen from '../screens/cycle/events/events';

import {CycleSettingStack} from './CycleSettingsStack';
import {TriggersStack} from './TriggersStack';
import {SchedulesStack} from './SchedulesStack';
import {MasterDeviceSettingsStack} from './MasterDeviceSettingsStack';

// Créé une seule fois (cf. AppStack) : sinon un re-rendu remonte les écrans.
const Stack = createStackNavigator();

export function CycleStack({typeFilter}: {typeFilter?: string} = {}) {
	const {t} = useTranslation('navigation');
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			animation: 'none',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'}
		} as StackNavigationOptions);
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="Cycles"
				component={CycleScreen}
				options={options(typeFilter==="MODULE" ? t('modules') : (typeFilter==='FERTIGATION' ? t('fertigation') : t('tasks')))}
				initialParams={{typeFilter}}
			/>
			<Stack.Screen
				name="CycleMenu"
				component={CycleMenuScreen}
				options={options(t('cyclesSettings'))}
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
		</Stack.Navigator>
	);
}
