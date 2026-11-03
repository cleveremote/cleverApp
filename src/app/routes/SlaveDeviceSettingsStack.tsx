import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import SlaveDeviceSettingsScreen from '../screens/devices/slave/SlaveDeviceSettingsScreen';
import SlaveGeneralSettingsSection from '../screens/devices/slave/SlaveGeneralSettingsSection';
import ComRequestsSection from '../screens/devices/slave/ComRequestsSection';
import {ComRequestSettingsStack} from './ComRequestSettingsStack';
import {ActuatorSettingsStack} from './ActuatorSettingsStack';
import {SensorSettingsStack} from './SensorSettingsStack';

export function SlaveDeviceSettingsStack() {
	const {t} = useTranslation('navigation');
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
				name="SlaveDeviceSettingsMenu"
				component={SlaveDeviceSettingsScreen}
				options={options(t('slaveDevice'))}
			/>
			<Stack.Screen
				name="SlaveGeneralSection"
				component={SlaveGeneralSettingsSection}
				options={options(t('general'))}
			/>
			<Stack.Screen
				name="ComRequestsSection"
				component={ComRequestsSection}
				options={options(t('comRequests'))}
			/>
			<Stack.Screen
				name="ComRequestSettingsStack"
				component={ComRequestSettingsStack}
				options={{headerShown: false}}
			/>
			<Stack.Screen
				name="ActuatorSettingsStack"
				component={ActuatorSettingsStack}
				options={{headerShown: false}}
			/>
			<Stack.Screen
				name="SensorSettingsStack"
				component={SensorSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default SlaveDeviceSettingsStack;
