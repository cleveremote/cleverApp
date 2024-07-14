import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import CycleScreen from '../screens/cycle/CyclesScreen';
import { CycleSettingStack } from './CycleSettingsStack';
import { TriggersStack } from './TriggersStack';
import { SchedulesStack } from './SchedulesStack';

export function CycleStack() {
    const options = (title: string) => ({ headerTitleAlign: 'center', animation: 'none', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' } } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
        <Stack.Navigator screenOptions={{ animation: 'none' }}>
            <Stack.Screen name="Cycles" component={CycleScreen} options={options('Cycles')} />
            <Stack.Screen name="Settings" component={CycleSettingStack} options={{ headerShown: false }} />
            <Stack.Screen name="TriggersStack" component={TriggersStack} options={{ headerShown: false }} />
            <Stack.Screen name="SchedulesStack" component={SchedulesStack} options={{ headerShown: false }} />
        </Stack.Navigator>
    )
}
