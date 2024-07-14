import React, { useEffect, useRef } from "react";
import messaging from '@react-native-firebase/messaging';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleDot, faLayerGroup, faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import { SettingsScreen } from "../screens/settings/settings";
import { AppState } from "react-native";
import { authenticationService } from "../../module/authentication/domain/services/auth.service";
import { connect } from "react-redux";
import { ParamListBase, RouteProp } from "@react-navigation/native";
import { CycleStack } from "./CycleStack";
import { SensorStack } from "./SensorStack";
import { listenerEvents, loadConfiguration } from "../../module/process/infrasctructure/store/actions/common";
import { NativeBaseProvider } from "native-base";
import { setIsConnected } from "../../module/process/infrasctructure/store/actions/state";
import { NoConnectionScreen } from "../screens/access/no-connexion";


type Props = { setIsConnected: (value: any) => void, isLoggedIn: boolean, loadConfiguration: () => any };

const tabBarIconCfg = (focused: boolean, route: RouteProp<ParamListBase, string>) => {
    let iconName;
    if (route.name === 'Settings') {
        iconName = faLayerGroup
    } else if (route.name === 'CyclesStack') {
        iconName = faSyncAlt;
    } else {
        iconName = faCircleDot;
    }
    return <FontAwesomeIcon icon={iconName} size={30} color={focused ? '#32404e' : 'grey'} />
}

export function AppStack(props: any) {

    const appState = useRef(AppState.currentState);
    useEffect(() => {
        if(props.isServerConnected){
            props.listenerEvents();
            props.loadConfiguration();
        }
        
    },[props.isServerConnected, props.isBoxConnected]);
    
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                await authenticationService.executeRefresh();
               props.loadConfiguration();
            }

            appState.current = nextAppState;
            if (appState.current === 'background') {
                authenticationService.socket?.disconnect();
            }
        });

        const devices = async () => {
            await messaging().registerDeviceForRemoteMessages();
            console.log('prepare get token');
            const token = await messaging().getToken();
            console.log('the token1 : ', token);
        }
        devices();
        return () => {
            subscription.remove();
        };

    }, []);

    const noConnectionScreen = () => {

        if (props.isConnected && !props.isServerConnected) {
            return (
                <NoConnectionScreen type={"SERVER"} />
            )
        } else if (props.isConnected && !props.isBoxConnected) {
            return (
                <NoConnectionScreen type={"BOX"} />
            )
        } else {
            return (<NoConnectionScreen type={"Not Logged"} />)
        }

    }

    const Tab = createBottomTabNavigator();
    return (
        <NativeBaseProvider>
            {props.isServerConnected && props.isBoxConnected ? (<Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#32404e', tabBarIcon: ({ focused }) => tabBarIconCfg(focused, route) })}>
                <Tab.Screen name="CyclesStack" options={{ headerShown: false, tabBarLabel: "Cycles", tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' } }} component={CycleStack} />
                <Tab.Screen name="Settings" options={{ headerShown: false, tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' } }} component={SettingsScreen} />
                <Tab.Screen name="SensorsStack" options={{ headerShown: false, tabBarLabel: "Sensors", tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' } }} component={SensorStack} />
            </Tab.Navigator>) : (noConnectionScreen())}
        </NativeBaseProvider>
    )
}

const mapStateToProps = (state: any) => ({
    isConnected: state.status.isConnected,
    isBoxConnected: state.status.isBoxConnected,
    isServerConnected: state.status.isServerConnected
});

export default connect(mapStateToProps, { setIsConnected, loadConfiguration, listenerEvents })(AppStack);