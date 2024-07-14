import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import ScheduleSettingsScreen from '../screens/cycle/schedules/settings/schedule/ScheduleSettingsScreen';
import ScheduleExecutionSettingsSection from '../screens/cycle/schedules/settings/schedule/ScheduleExecutionSettingsSection';
import ScheduleGeneralSettingsSection from '../screens/cycle/schedules/settings/schedule/ScheduleGeneralSettingsSection';
import { navigationHeader } from '../components/common/navigationHeaders';

export function ScheduleSettingsStack() {

    const options = (title: string) => ({
        headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' },
        headerLeft: () => navigationHeader(() => { }, 'arrow-alt-circle-left', false)
    } as NativeStackNavigationOptions);

    //const options = (title: string) => ({ headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' } } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
        <Stack.Navigator screenOptions={{ animation: 'none' }}>
            <Stack.Screen name="ScheduleSettingsMenu" component={ScheduleSettingsScreen} options={options('Trigger Settings')} />
            <Stack.Screen name="ScheduleGeneralSettingsSection" component={ScheduleGeneralSettingsSection} options={options('General')} />
            <Stack.Screen name="ScheduleExecutionSettingsSection" component={ScheduleExecutionSettingsSection} options={options('Execution')} />
        </Stack.Navigator>
    )
}