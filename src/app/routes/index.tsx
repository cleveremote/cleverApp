import React from 'react';
import {connect} from 'react-redux';
import {Linking} from 'react-native';
import {LinkingOptions, NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import AppStack from './AppStack';
import {AccessStack} from './AccessStack';
import {BOX_LINK_SCHEME, isCleverBoxLink} from '../../services/hotspot';

const Stack = createStackNavigator();
const RootStack = createStackNavigator();

const BOX_LINK_PREFIX = `${BOX_LINK_SCHEME}://`;

// Le conteneur est remonté à chaque changement de langue (voir App.tsx) : sans
// ce témoin, le lien qui a lancé l'application serait rejoué à chaque fois.
let initialUrlConsumed = false;

/**
 * Lien d'appairage (`cleverapp://box?…`) porté par le QR code de la box et
 * ouvert depuis l'appareil photo du téléphone : il mène au scanner, qui
 * reprend l'appairage comme s'il avait lu le code lui-même — contrôle du
 * doublon, hotspot, puis formulaire de configuration.
 */
const linking: LinkingOptions<any> = {
	prefixes: [BOX_LINK_PREFIX],
	getInitialURL: async () => {
		if (initialUrlConsumed) return null;
		initialUrlConsumed = true;
		return Linking.getInitialURL();
	},
	getStateFromPath: path => {
		const url = `${BOX_LINK_PREFIX}${path.replace(/^\/+/, '')}`;
		if (!isCleverBoxLink(url)) return undefined;
		return {
			routes: [
				{
					name: 'Auth',
					state: {
						routes: [
							{name: 'Profiles'},
							{name: 'ScanBox', params: {qr: url}}
						]
					}
				}
			]
		};
	}
};

export const Router = ({isConnected}: {isConnected: boolean}) => {
	return (
		// Une session ouverte n'a pas d'écran d'appairage : le lien y est ignoré.
		<NavigationContainer linking={{...linking, enabled: !isConnected}}>
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
