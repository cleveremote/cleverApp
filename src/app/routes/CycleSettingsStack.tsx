import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import CycleGeneralSettingsSection from '../screens/cycle/settings/cycle/CycleGeneralSettingsSection';
import SeqSettingsSection from '../screens/cycle/settings/cycle/CycleSeqSettingsSection';
import CycleChildrenSettingsSection from '../screens/cycle/settings/cycle/CycleChildrenSettingsSection';
import CycleSettingsScreen from '../screens/cycle/settings/cycle/CycleSettingsScreen';
import {SequenceSettingStack} from './SequenceSettingsStack';
import {navigationHeader} from '../components/common/navigationHeaders';

export function CycleSettingStack() {
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
				name="CycleSettingsMenu"
				component={CycleSettingsScreen}
				options={options(t('cycleSettings'))}
			/>
			<Stack.Screen
				name="CycleGeneralSection"
				component={CycleGeneralSettingsSection}
				options={options(t('general'))}
			/>
			<Stack.Screen
				name="CycleSequenceSection"
				component={SeqSettingsSection}
				options={options(t('sequences'))}
			/>
			<Stack.Screen
				name="CycleChildrenSection"
				component={CycleChildrenSettingsSection}
				options={options(t('cycles'))}
			/>
			<Stack.Screen
				name="SequenceSettingsStack"
				component={SequenceSettingStack}
				options={{headerShown: false}}
			/>
		</Stack.Navigator>
	);
}
