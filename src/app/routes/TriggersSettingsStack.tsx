import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import TriggerSettingsScreen from '../screens/cycle/triggers/settings/trigger/TriggerSettingsScreen';
import TriggerExecutionSettingsSection from '../screens/cycle/triggers/settings/trigger/TriggerExecutionSettingsSection';
import TriggerGeneralSettingsSection from '../screens/cycle/triggers/settings/trigger/TriggerGeneralSettingsSection';

export function TriggerSettingsStack() {
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
				name="TriggerSettingsMenu"
				component={TriggerSettingsScreen}
				options={options(t('triggerSettings'))}
			/>
			<Stack.Screen
				name="TriggerGeneralSettingsSection"
				component={TriggerGeneralSettingsSection}
				options={options(t('general'))}
			/>
			<Stack.Screen
				name="TriggerExecutionSettingsSection"
				component={TriggerExecutionSettingsSection}
				options={options(t('execution'))}
			/>
		</Stack.Navigator>
	);
}
