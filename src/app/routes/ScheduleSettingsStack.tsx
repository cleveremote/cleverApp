import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import ScheduleSettingsScreen from '../screens/cycle/schedules/settings/schedule/ScheduleSettingsScreen';
import ScheduleGeneralSettingsSection from '../screens/cycle/schedules/settings/schedule/ScheduleGeneralSettingsSection';
import {navigationHeader} from '../components/common/navigationHeaders';

export function ScheduleSettingsStack() {
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

	//const options = (title: string) => ({ headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' } } as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="ScheduleSettingsMenu"
				component={ScheduleSettingsScreen}
				options={options(t('scheduleSettings'))}
			/>
			<Stack.Screen
				name="ScheduleGeneralSettingsSection"
				component={ScheduleGeneralSettingsSection}
				options={options(t('general'))}
			/>
		</Stack.Navigator>
	);
}
