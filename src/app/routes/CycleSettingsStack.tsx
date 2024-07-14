import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import CycleGeneralSettingsSection from '../screens/cycle/settings/cycle/CycleGeneralSettingsSection';
import CyclePrioritySettingsSection from '../screens/cycle/settings/cycle/CyclePrioritySettingsSection';
import SeqSettingsSection from '../screens/cycle/settings/cycle/CycleSeqSettingsSection';
import CycleSettingsScreen from '../screens/cycle/settings/cycle/CycleSettingsScreen';
import { SequenceSettingStack } from './SequenceSettingsStack';
import { navigationHeader } from '../components/common/navigationHeaders';


export function CycleSettingStack() {
    const options = (title: string) => ({
        headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' },
        headerLeft: () => navigationHeader(() => { }, 'arrow-alt-circle-left', false)
    } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (

        <Stack.Navigator screenOptions={{ animation: 'none' }}>
            <Stack.Screen name="CycleSettingsMenu" component={CycleSettingsScreen} options={options('Cycle Settings')} />
            <Stack.Screen name="CycleGeneralSection" component={CycleGeneralSettingsSection} options={options('General')} />
            <Stack.Screen name="CyclePrioritySection" component={CyclePrioritySettingsSection} options={options('Priority')} />
            <Stack.Screen name="CycleSequenceSection" component={SeqSettingsSection} options={options('Sequences')} />
            <Stack.Screen name="SequenceSettingsStack" component={SequenceSettingStack} options={{ headerShown: false }} />
        </Stack.Navigator>
    )
}
