import React from 'react';
import {useTranslation} from 'react-i18next';
import {
	StackNavigationOptions,
	createStackNavigator
} from '@react-navigation/stack';
import SynoptiquesScreen from '../screens/synoptique/SynoptiquesScreen';

export function SynoptiquesStack() {
	const {t} = useTranslation('navigation');
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
				options={options(t('synoptics'))}
			/>
		</Stack.Navigator>
	);
}

export default SynoptiquesStack;
