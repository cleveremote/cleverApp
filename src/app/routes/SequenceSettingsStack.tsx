import React from 'react';
import { NativeBaseProvider } from 'native-base';
import { NativeStackNavigationOptions, createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from '../../module/process/infrasctructure/store/store';
import SequenceSettingsScreen from '../screens/cycle/settings/sequence/SequenceSettingsScreen';
import SequenceGeneralSettingsSection from '../screens/cycle/settings/sequence/SequenceGeneralSettingsSection';
import SequenceSecuritySettingsSection from '../screens/cycle/settings/sequence/SequenceSecuritySettingsSection';
import SequenceModulesSettingsSection from '../screens/cycle/settings/sequence/SequenceModulesSettingsSection';
import { navigationHeader } from '../components/common/navigationHeaders';


export function SequenceSettingStack() {
    const options = (title: string) => ({ headerTitleAlign: 'center', title: title, headerTintColor: '#32404e', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' },
        headerLeft: () => navigationHeader(() => { }, 'arrow-alt-circle-left', false)
    } as NativeStackNavigationOptions);
    const Stack = createNativeStackNavigator();
    return (
                <Stack.Navigator screenOptions={{ animation: 'none' }}>
                    <Stack.Screen name="SequenceSettingsMenu" component={SequenceSettingsScreen} options={options('Sequence Settings')} />
                    <Stack.Screen name="SequenceGeneralSection" component={SequenceGeneralSettingsSection} options={options('General')} />
                    <Stack.Screen name="SequenceSecuritySection" component={SequenceSecuritySettingsSection} options={options('Security')} />
                    <Stack.Screen name="SequenceModulesSettingsSection" component={SequenceModulesSettingsSection} options={options('Modules')} />
                </Stack.Navigator>
    )
}
