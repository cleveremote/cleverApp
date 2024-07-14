import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import SensorsScreen from '../screens/sensor/SensorsScreen';
import { SensorSettingsStack } from './SensorSettingsStack';

export function SensorStack() {
    const options = (title: string) => ({ headerTitleAlign: 'center', animation: 'none', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' } } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
                <Stack.Navigator screenOptions={{ animation: 'none' }}>
                    <Stack.Screen name="Sensors" component={SensorsScreen} options={options('Sensors')} />
                    <Stack.Screen name="Settings" component={SensorSettingsStack} options={{ headerShown: false }} />
                </Stack.Navigator>
    )
}
