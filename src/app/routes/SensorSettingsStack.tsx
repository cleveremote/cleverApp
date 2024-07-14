import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import  SensorGeneralSettingsSection from '../screens/sensor/settings/SensorGeneralSettingsSection';
import SensorSettingsScreen from '../screens/sensor/settings/SensorSettingsScreen';
import { navigationHeader } from '../components/common/navigationHeaders';


export function SensorSettingsStack() {
    const options = (title: string) => ({ headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }, 
        headerLeft: () => navigationHeader(()=>{}, 'arrow-alt-circle-left', false) } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
                <Stack.Navigator screenOptions={{ animation: 'none' }}>
                    <Stack.Screen name="SensorSettingsMenu" component={SensorSettingsScreen} options={options('Sensor Settings')} />
                    <Stack.Screen name="SensorGeneralSection" component={SensorGeneralSettingsSection} options={options('General')} />
                </Stack.Navigator>
    )
}
