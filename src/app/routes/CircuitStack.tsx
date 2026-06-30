import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import FertigationScreen from '../screens/fertigation/FertigationScreen';

export function CircuitStack() {
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
				name="Circuit"
				component={FertigationScreen}
				options={options('Circuit')}
			/>
		</Stack.Navigator>
	);
}
