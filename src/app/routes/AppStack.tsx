import React, { useEffect, useRef } from "react";
import messaging from '@react-native-firebase/messaging';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBorderAll, faCircleDot, faImage, faImagePortrait, faImages, faLayerGroup, faMap, faPlane, faSyncAlt } from "@fortawesome/free-solid-svg-icons";
import { SettingsScreen } from "../screens/settings/settings";
import { AppState } from "react-native";
import { authenticationService } from "../../module/authentication/domain/services/auth.service";
import { connect } from "react-redux";
import { ParamListBase, RouteProp } from "@react-navigation/native";
import { CycleStack } from "./CycleStack";
import { SensorStack } from "./SensorStack";
import { listenerEvents, loadConfiguration, loadPlan } from "../../module/process/infrasctructure/store/actions/common";
import { NativeBaseProvider } from "native-base";
import { setIsConnected } from "../../module/process/infrasctructure/store/actions/state";
import { NoConnectionScreen } from "../screens/access/no-connexion";
import { loadValues } from "../../module/process/infrasctructure/store/actions/cycle";
import { PlanStack } from "./PlanStack";


type Props = { setIsConnected: (value: any) => void, isLoggedIn: boolean, loadConfiguration: () => any };

const tabBarIconCfg = (focused: boolean, route: RouteProp<ParamListBase, string>) => {
    let iconName;
    if (route.name === 'Settings') {
        iconName = faLayerGroup
    } else if (route.name === 'CyclesStack') {
        iconName = faSyncAlt;
    } else if (route.name === 'PlanStack') {
        iconName = faBorderAll;
    } else {
        iconName = faCircleDot;
    }
    return <FontAwesomeIcon icon={iconName} size={30} color={focused ? '#32404e' : 'grey'} />
}

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
        const subscription = AppState.addEventListener('change', async nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {

               
                    await authenticationService.executeRefresh();
                    props.loadConfiguration();
                    props.loadPlan();
                    props.loadValues('PROCESS');

            }

            appState.current = nextAppState;
            if (appState.current === 'background') {
                authenticationService.socket?.disconnect();
            }
        });
        //// FCM google
        const devices = async () => {
            await messaging().registerDeviceForRemoteMessages();
            const token = await messaging().getToken();
        }
        devices();
        return () => {
            subscription.remove();
        };

    }, []);

    const noConnectionScreen = () => {

        if (props.isConnected && !props.isServerConnected) {
            return (
                <NoConnectionScreen type={"SERVER"} navigation={props.navigation}/>
            )
        } else if (props.isConnected && !props.isBoxConnected) {
            return (
                <NoConnectionScreen type={"BOX"} navigation={props.navigation}/>
            )
        } else {
            return (<NoConnectionScreen type={"Not Logged"} navigation={props.navigation} />)
        }

    }

    const Tab = createBottomTabNavigator();
    return (
        <NativeBaseProvider>
            {props.isServerConnected && props.isBoxConnected ?
                (
                    <Tab.Navigator screenOptions={({ route }) => ({ tabBarActiveTintColor: '#32404e', tabBarIcon: ({ focused }) => tabBarIconCfg(focused, route) })}>
                        <Tab.Screen name="CyclesStack" options={{ headerShown: false, tabBarLabel: "Cycles",  }} component={CycleStack} />
                        <Tab.Screen name="PlanStack" options={{ headerShown: false, tabBarLabel: "Plan" }} component={PlanStack} />
                        <Tab.Screen name="Settings" options={{ headerShown: false,  }} component={SettingsScreen} />
                        <Tab.Screen name="SensorsStack" options={{ headerShown: false, tabBarLabel: "Sensors", }} component={SensorStack} />
                    </Tab.Navigator>
                ) : noConnectionScreen()
            }
        </NativeBaseProvider>
    )
}

const mapStateToProps = (state: any) => ({
    isConnected: state.status.isConnected,
    isBoxConnected: state.status.isBoxConnected,
    isServerConnected: state.status.isServerConnected
});

export default connect(mapStateToProps, { setIsConnected, loadConfiguration, loadValues, listenerEvents,loadPlan })(AppStack);