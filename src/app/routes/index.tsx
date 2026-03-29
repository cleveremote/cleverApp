import React from 'react';
import {connect} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AppStack from './AppStack';
import {AccessStack} from './AccessStack';

const Stack = createStackNavigator();
const RootStack = createStackNavigator();

export const Router = ({isConnected}: {isConnected: boolean}) => {
	return (
		<NavigationContainer>
			<Stack.Navigator
				screenOptions={{gestureEnabled: true, headerShown: false}}>
				{!isConnected ? (
					<RootStack.Screen
						name="Auth"
						component={AccessStack}
						options={{animation: 'none'}}
					/>
				) : (
					<RootStack.Screen
						name="App"
						component={AppStack}
						options={{animation: 'none'}}
					/>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
};

const mapStateToProps = (state: any) => ({
	isConnected: state.status?.isConnected
});

export default connect(mapStateToProps, null)(Router);
