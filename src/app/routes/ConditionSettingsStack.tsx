import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import TriggerConditionParamSettingsSection from '../screens/cycle/triggers/settings/condition/TriggerConditionParamSettingsSection';
import TriggerConditionGeneralSettingsSection from '../screens/cycle/triggers/settings/condition/TriggerConditionGeneralSettingsSection';
import TriggerConditionSettingsScreen from '../screens/cycle/triggers/settings/condition/TriggerConditionSettingsScreen';


export function ConditionSettingsStack() {
    const options = (title: string) => ({ headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' } } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
        <Stack.Navigator screenOptions={{ animation: 'none' }}>
            <Stack.Screen name="TriggerConditionSettingsScreen" component={TriggerConditionSettingsScreen} options={options('Condition settings')} />
            <Stack.Screen name="TriggerConditionGeneralSettingsSection" component={TriggerConditionGeneralSettingsSection} options={options('General')} />
            <Stack.Screen name="TriggerConditionParamSettingsSection" component={TriggerConditionParamSettingsSection} options={options('Parameters')} />
        </Stack.Navigator>
    )
}


