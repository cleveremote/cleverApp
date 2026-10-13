import React from 'react';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import SynoptiquesScreen from '../screens/synoptique/SynoptiquesScreen';

export function SynoptiquesStack() {
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
				name="Synoptiques"
				component={SynoptiquesScreen}
				options={options('Synoptiques')}
			/>
		</Stack.Navigator>
	);
}

export default SynoptiquesStack;
