import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import TanksScreen from '../screens/tanks/TanksScreen';

export function TanksStack() {
	const options = (title: string) =>
		({
			headerTitleAlign: 'center',
			animation: 'none',
			title: title,
			headerTintColor: '#32404e',
			headerTitleStyle: {fontSize: 20, fontWeight: 'bold'}
		} as StackNavigationOptions);
	const Stack = createStackNavigator();
	return (
		<Stack.Navigator screenOptions={{animation: 'none'}}>
			<Stack.Screen
				name="Tanks"
				component={TanksScreen}
				options={options('Bacs 200L')}
			/>
		</Stack.Navigator>
	);
}
