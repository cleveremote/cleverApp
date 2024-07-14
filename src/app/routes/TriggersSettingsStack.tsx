import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import TriggerSettingsScreen from '../screens/cycle/triggers/settings/trigger/TriggerSettingsScreen';
import TriggerExecutionSettingsSection from '../screens/cycle/triggers/settings/trigger/TriggerExecutionSettingsSection';
import TriggerGeneralSettingsSection from '../screens/cycle/triggers/settings/trigger/TriggerGeneralSettingsSection';
import TriggerConditionsSection from '../screens/cycle/triggers/settings/trigger/TriggerConditionsSection';
import { ConditionSettingsStack } from './ConditionSettingsStack';

export function TriggerSettingsStack() {
    const options = (title: string) => ({ headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' } } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
        <Stack.Navigator screenOptions={{ animation: 'none' }}>
            <Stack.Screen name="TriggerSettingsMenu" component={TriggerSettingsScreen} options={options('Trigger Settings')} />
            <Stack.Screen name="TriggerGeneralSettingsSection" component={TriggerGeneralSettingsSection} options={options('General')} />
            <Stack.Screen name="TriggerExecutionSettingsSection" component={TriggerExecutionSettingsSection} options={options('Execution')} />
            <Stack.Screen name="TriggerConditionsSection" component={TriggerConditionsSection} options={options('Conditions')} />
            <Stack.Screen name="ConditionSettingsStack" component={ConditionSettingsStack} options={{ headerShown: false }} />
        </Stack.Navigator>
    )
}