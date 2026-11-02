import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import SettingsMenuScreen from '../screens/settings/SettingsMenuScreen';
import UserSettingsScreen from '../screens/settings/UserSettingsScreen';
import DisplayManagerScreen from '../screens/settings/DisplayManagerScreen';
import GlobalSettingsScreen from '../screens/settings/GlobalSettingsScreen';
import {DevicesStack} from './DevicesStack';
import {ActuatorsStack} from './ActuatorsStack';

export function SettingsStack() {
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
				name="SettingsMenu"
				component={SettingsMenuScreen}
				options={options(t('settings'))}
			/>
			<Stack.Screen
				name="UserSettings"
				component={UserSettingsScreen}
				options={options(t('userSettings'))}
			/>
			<Stack.Screen
				name="DisplayManager"
				component={DisplayManagerScreen}
				options={options(t('displayManager'))}
			/>
			<Stack.Screen
				name="GlobalSettings"
				component={GlobalSettingsScreen}
				options={options(t('globalSettings'))}
			/>
			<Stack.Screen
				name="DevicesStack"
				component={DevicesStack}
				options={{headerShown: false}}
			/>
			<Stack.Screen
				name="ActuatorsStack"
				component={ActuatorsStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}

export default SettingsStack;
