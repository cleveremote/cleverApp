import React, { useEffect, useRef } from 'react';
import {useTranslation} from 'react-i18next';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
	faCircleDot,
	faDiagramProject,
	faFlask,
	faGear,
	faImage,
	faImagePortrait,
	faImages,
	faLayerGroup,
	faList,
	faListCheck,
	faMap,
	faPlane
} from '@fortawesome/free-solid-svg-icons';
import { AppState, StyleSheet, View } from 'react-native';
import { authenticationService } from '../../module/authentication/domain/services/auth.service';
import { socketService } from '../../services/socket';
import { connect } from 'react-redux';
import { ParamListBase, RouteProp } from '@react-navigation/native';
import { CycleStack } from './CycleStack';
import { SynoptiquesStack } from './SynoptiquesStack';
import { SensorStack } from './SensorStack';
import { SettingsStack } from './SettingsStack';
import {
	listenerEvents,
	loadConfiguration,
	loadPlan
} from '../../module/process/infrasctructure/store/actions/common';
import { setIsConnected, setIsServerConnected, setIsBoxConnected } from '../../module/process/infrasctructure/store/actions/state';
import { NoConnectionScreen } from '../screens/access/no-connexion';
import { loadValues } from '../../module/process/infrasctructure/store/actions/cycle';

type Props = {
	setIsConnected: (value: any) => void;
	isLoggedIn: boolean;
	loadConfiguration: () => any;
};

const tabBarIconCfg = (
	focused: boolean,
	route: RouteProp<ParamListBase, string>
) => {
	let iconName;
	if (route.name === 'SettingsStack') {
		iconName = faGear;
	} else if (route.name === 'CyclesStack') {
		iconName = faList;
	} else if (route.name === 'SynoptiquesStack') {
		iconName = faDiagramProject;
	} else if (route.name === 'SensorsStack') {
		iconName = faCircleDot;
	} else {
		iconName = faFlask;
	}
	return (
		<FontAwesomeIcon
			icon={iconName}
			size={30}
			color={focused ? '#32404e' : 'grey'}
		/>
	);
};

// Créé une seule fois : recréé à chaque rendu, chaque re-rendu d'AppStack
// remonterait tous les écrans (états locaux, timers de progression…).
const Tab = createBottomTabNavigator();

export function AppStack(props: any) {
	const {t} = useTranslation('navigation');
	const appState = useRef(AppState.currentState);
	useEffect(() => {
		if (props.isServerConnected && props.isBoxConnected) {
			props.listenerEvents();
			props.loadValues('PROCESS');
			// Reconnexion avec des données déjà à l'écran : pas de loader global.
			props.loadConfiguration(undefined, props.hasConfiguration);
			props.loadPlan();
		}
	}, [props.isServerConnected, props.isBoxConnected]);

	useEffect(() => {
		const RECONNECT_TIMEOUT_MS = 10000;
		let reconnectTimer: NodeJS.Timeout | null = null;

		const subscription = AppState.addEventListener(
			'change',
			async nextAppState => {
				if (
					appState.current.match(/inactive|background/) &&
					nextAppState === 'active'
				) {
					// Start a timeout: if not reconnected within delay, force NoConnection
					reconnectTimer = setTimeout(() => {
						if (!socketService.connected) {
							props.setIsServerConnected(false);
							props.setIsBoxConnected(false);
						}
					}, RECONNECT_TIMEOUT_MS);

					await authenticationService.executeRefresh();

					// If reconnection succeeded, cancel the timeout and reload data
					if (socketService.connected) {
						if (reconnectTimer) {
							clearTimeout(reconnectTimer);
							reconnectTimer = null;
						}
						// Le socket a pu être recréé (listeners perdus) sans que
						// isServerConnected ne change : on les ré-enregistre.
						props.listenerEvents();
						// Retour au premier plan : les données sont déjà à
						// l'écran, on les rafraîchit sans loader global.
						props.loadConfiguration(undefined, true);
						props.loadPlan();
						props.loadValues('PROCESS');
					}
				}

				appState.current = nextAppState;
				if (appState.current === 'background') {
					socketService.pause();
				}
			}
		);
		return () => {
			subscription.remove();
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
			}
		};
	}, []);

	const noConnectionScreen = () => {
		if (props.isConnected && !props.isServerConnected) {
			return (
				<NoConnectionScreen
					type={'SERVER'}
					navigation={props.navigation}
				/>
			);
		} else if (props.isConnected && !props.isBoxConnected) {
			return (
				<NoConnectionScreen
					type={'BOX'}
					navigation={props.navigation}
				/>
			);
		} else {
			return (
				<NoConnectionScreen
					type={'Not Logged'}
					navigation={props.navigation}
				/>
			);
		}
	};

	const isOnline = props.isServerConnected && props.isBoxConnected;
	// Une fois les onglets montés, une coupure (ex. échec de la première
	// tentative de reconnexion au retour au premier plan) ne les démonte plus :
	// l'écran « pas de connexion » s'affiche par-dessus et les écrans gardent
	// leur état.
	const wasOnline = useRef(false);
	if (isOnline) {
		wasOnline.current = true;
	}
	if (!props.isConnected) {
		wasOnline.current = false;
	}

	return (
		<>
			{isOnline || wasOnline.current ? (
				<Tab.Navigator
					safeAreaInsets={{ bottom: 20 }}
					screenOptions={({ route }) => ({
						tabBarItemStyle: {
							justifyContent: 'center',
							alignItems: 'center',
							paddingBottom: 0,
							paddingTop: 10,
						},
						tabBarStyle: {
							justifyContent: 'center',
						},
						tabBarActiveTintColor: '#32404e',
						tabBarIcon: ({ focused }) => tabBarIconCfg(focused, route)
					})}>
					<Tab.Screen
						name="CyclesStack"
						options={{ headerShown: false, tabBarLabel: t('tasks') }}
						component={CycleStack}
					/>

					<Tab.Screen
						name="SensorsStack"
						options={{ headerShown: false, tabBarLabel: t('sensors') }}
						component={SensorStack}
					/>

					<Tab.Screen
						name="SynoptiquesStack"
						options={{ headerShown: false, tabBarLabel: t('synoptics') }}
						component={SynoptiquesStack}
					/>

					<Tab.Screen
						name="SettingsStack"
						options={{ headerShown: false, tabBarLabel: t('settings') }}
						component={SettingsStack}
					/>
				</Tab.Navigator>
			) : null}
			{!isOnline ? (
				<View style={[StyleSheet.absoluteFill, { backgroundColor: 'white' }]}>
					{noConnectionScreen()}
				</View>
			) : null}
		</>
	);
}

const mapStateToProps = (state: any) => ({
	isConnected: state.status.isConnected,
	isBoxConnected: state.status.isBoxConnected,
	isServerConnected: state.status.isServerConnected,
	hasConfiguration: !!(
		state.root_cycle.cycles?.length || state.root_device.devices?.length
	)
});

export default connect(mapStateToProps, {
	setIsConnected,
	setIsServerConnected,
	setIsBoxConnected,
	loadConfiguration,
	loadValues,
	listenerEvents,
	loadPlan
})(AppStack);
