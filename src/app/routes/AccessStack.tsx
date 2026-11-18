import React from 'react';
import {useTranslation} from 'react-i18next';
import {createStackNavigator} from '@react-navigation/stack';
import {ProfilesScreen} from '../screens/access/loading';
import SignIn from '../screens/access/SignIn';
import {ScanBoxScreen} from '../screens/access/scanBox';
import {BoxConfiguration} from '../screens/access/boxConfiguration';
import {BoxHandover} from '../screens/access/boxHandover';
import {ForgotPassword} from '../screens/access/forgotPassword';
export function AccessStack() {
	const {t} = useTranslation('navigation');
	const Stack = createStackNavigator();
	return (
		<>
			<Stack.Navigator screenOptions={{
    headerLeft: () => null, // reset global
  }}>
				<Stack.Screen
					name="Profiles"
					options={{headerShown: false}}
					component={ProfilesScreen}
				/>
				<Stack.Screen
					name="ScanBox"
					options={{headerShown: true, title: t('scanBox')}}
					component={ScanBoxScreen}
				/>
				<Stack.Screen
					name="BoxConfiguration"
					options={{headerShown: true, title: t('configureBox'), headerTitleAlign: 'center'}}
					component={BoxConfiguration}
				/>
				<Stack.Screen
					name="BoxHandover"
					options={{
						headerShown: true,
						title: t('boxConnection'),
						// Le geste de retour ramènerait au formulaire, qui n'a
						// plus de réseau : la sortie passe par l'en-tête.
						gestureEnabled: false
					}}
					component={BoxHandover}
				/>
				<Stack.Screen
					name="Signin"
					options={{headerShown: true, title: t('signIn'),headerStyle: {backgroundColor: 'white'}}}
					component={SignIn}
				/>
				<Stack.Screen
					name="ForgotPassword"
					options={{headerShown: true, title: t('forgotPassword'), headerStyle: {backgroundColor: 'white'}}}
					component={ForgotPassword}
				/>
			</Stack.Navigator>
		</>
	);
}
