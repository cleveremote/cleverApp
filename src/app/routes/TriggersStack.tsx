import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import {Provider} from 'react-redux';
import {store} from '../../module/process/infrasctructure/store/store';
import TriggersScreen from '../screens/cycle/triggers/TriggersScreen';
import {TriggerSettingsStack} from './TriggersSettingsStack';

export function TriggersStack() {
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'}
		} as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="Triggers"
				component={TriggersScreen}
				options={options('Triggers')}
			/>
			<Stack.Screen
				name="TriggerSettingsStack"
				component={TriggerSettingsStack}
				options={{headerShown: false}}
			/>
			{/*<Stack.Screen name="CycleGeneralSection" component={GeneralSettingsSection} options={options('General')} />
                    <Stack.Screen name="CyclePrioritySection" component={PrioritySettingsSection} options={options('Priority')} />
                    <Stack.Screen name="CycleSequenceSection" component={SeqSettingsSection} options={options('Sequences')} />
                    */}
		</Stack.Navigator>
	);
}
