import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import SensorsScreen from '../screens/sensor/SensorsScreen';
import SensorMenuScreen from '../screens/sensor/SensorMenuScreen';
import {SensorSettingsStack} from './SensorSettingsStack';
import {MasterDeviceSettingsStack} from './MasterDeviceSettingsStack';

export function SensorStack() {
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
				name="Sensors"
				component={SensorsScreen}
				options={options(t('sensors'))}
			/>
			<Stack.Screen
				name="SensorMenu"
				component={SensorMenuScreen}
				options={options(t('sensorsSettings'))}
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
				component={SensorSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}
