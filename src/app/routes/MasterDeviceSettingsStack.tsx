import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import MasterDeviceSettingsScreen from '../screens/devices/master/MasterDeviceSettingsScreen';
import MasterGeneralSettingsSection from '../screens/devices/master/MasterGeneralSettingsSection';
import SlaveDevicesSection from '../screens/devices/master/SlaveDevicesSection';
import {SlaveDeviceSettingsStack} from './SlaveDeviceSettingsStack';

export function MasterDeviceSettingsStack() {
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
				name="MasterDeviceSettingsMenu"
				component={MasterDeviceSettingsScreen}
				options={options(t('masterDevice'))}
			/>
			<Stack.Screen
				name="MasterGeneralSection"
				component={MasterGeneralSettingsSection}
				options={options(t('general'))}
			/>
			<Stack.Screen
				name="SlaveDevicesSection"
				component={SlaveDevicesSection}
				options={options(t('slaveDevices'))}
			/>
			<Stack.Screen
				name="SlaveDeviceSettingsStack"
				component={SlaveDeviceSettingsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default MasterDeviceSettingsStack;
