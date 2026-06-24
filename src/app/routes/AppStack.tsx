import React, {useEffect, useRef} from 'react';
import messaging from '@react-native-firebase/messaging';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faBorderAll,
	faCircleDot,
	faImage,
	faImagePortrait,
	faImages,
	faLayerGroup,
	faMap,
	faPlane,
	faSyncAlt
} from '@fortawesome/free-solid-svg-icons';
import {SettingsScreen} from '../screens/settings/settings';
import {AppState} from 'react-native';
import {authenticationService} from '../../module/authentication/domain/services/auth.service';
import {socketService} from '../../services/socket';
import {connect} from 'react-redux';
import {ParamListBase, RouteProp} from '@react-navigation/native';
import {CycleStack} from './CycleStack';
import {SensorStack} from './SensorStack';
import {
	listenerEvents,
	loadConfiguration,
	loadPlan
} from '../../module/process/infrasctructure/store/actions/common';
import {setIsConnected, setIsServerConnected, setIsBoxConnected} from '../../module/process/infrasctructure/store/actions/state';
import {NoConnectionScreen} from '../screens/access/no-connexion';
import {loadValues} from '../../module/process/infrasctructure/store/actions/cycle';
import {PlanStack} from './PlanStack';

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
	if (route.name === 'Settings') {
		iconName = faLayerGroup;
	} else if (route.name === 'CyclesStack') {
		iconName = faSyncAlt;
	} else if (route.name === 'PlanStack') {
		iconName = faBorderAll;
	} else {
		iconName = faCircleDot;
	}
	return (
		<FontAwesomeIcon
			icon={iconName}
			size={30}
			color={focused ? '#32404e' : 'grey'}
		/>
	);
};

export function AppStack(props: any) {
	const appState = useRef(AppState.currentState);
	useEffect(() => {
		if (props.isServerConnected && props.isBoxConnected) {
			props.listenerEvents();
			props.loadValues('PROCESS');
			props.loadConfiguration();
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
						props.loadConfiguration();
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
		//// FCM google
		const devices = async () => {
			await messaging().registerDeviceForRemoteMessages();
			const token = await messaging().getToken();
		};
		devices();
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

	const Tab = createBottomTabNavigator();
	return (
		<>
			{props.isServerConnected && props.isBoxConnected ? (
				<Tab.Navigator
				safeAreaInsets={{ bottom: 20 }}
					screenOptions={({route}) => ({
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
						tabBarIcon: ({focused}) => tabBarIconCfg(focused, route)
					})}>
					<Tab.Screen
						name="CyclesStack"
						options={{headerShown: false, tabBarLabel: 'Cycles'}}
						component={CycleStack}
					/>
					<Tab.Screen
						name="PlanStack"
						options={{headerShown: false, tabBarLabel: 'Plan'}}
						component={PlanStack}
					/>
					<Tab.Screen
						name="Settings"
						options={{headerShown: false}}
						component={SettingsScreen}
					/>
					<Tab.Screen
						name="SensorsStack"
						options={{headerShown: false, tabBarLabel: 'Sensors'}}
						component={SensorStack}
					/>
				</Tab.Navigator>
			) : (
				noConnectionScreen()
			)}
		</>
	);
}

const mapStateToProps = (state: any) => ({
	isConnected: state.status.isConnected,
	isBoxConnected: state.status.isBoxConnected,
	isServerConnected: state.status.isServerConnected
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
