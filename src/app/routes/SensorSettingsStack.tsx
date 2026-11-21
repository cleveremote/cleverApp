import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import SensorGeneralSettingsSection from '../screens/sensor/settings/SensorGeneralSettingsSection';
import SensorConfigurationSettingsSection from '../screens/sensor/settings/SensorConfigurationSettingsSection';
import SensorSettingsScreen from '../screens/sensor/settings/SensorSettingsScreen';
import {navigationHeader} from '../components/common/navigationHeaders';

export function SensorSettingsStack() {
	const {t} = useTranslation('navigation');
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'},
			headerLeft: () =>
				navigationHeader(() => {}, 'arrow-alt-circle-left', false)
		} as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="SensorSettingsMenu"
				component={SensorSettingsScreen}
				options={options(t('sensorSettings'))}
			/>
			<Stack.Screen
				name="SensorGeneralSection"
				component={SensorGeneralSettingsSection}
				options={options(t('general'))}
			/>
			<Stack.Screen
				name="SensorConfigurationSection"
				component={SensorConfigurationSettingsSection}
				options={options(t('configuration'))}
			/>
		</Stack.Navigator>
	);
}
