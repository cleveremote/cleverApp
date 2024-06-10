import React, { Component } from 'react';
import { NativeBaseProvider, Box, IconButton } from 'native-base';
import { AppState, AppStateStatus, NativeEventSubscription, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCircleDot, faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons';
import ReactNativeHapticFeedback, { HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CycleNavigation } from '../../navigations/cycleNavigation';
import { SettingsScreen } from '../settings/settings';
import { AuthVerify } from '../../components/common/AuthVerify';
import { Subscription } from 'react-redux';

type MyProps = { navigation: any; };

type MyState = { appStateVisible: AppStateStatus; appState: AppStateStatus };

class Clv extends Component<MyProps, MyState> {
    private subscription: NativeEventSubscription;
    constructor(props: MyProps) {
        super(props);

        this.state = { appStateVisible: 'unknown', appState: AppState.currentState };
    }

    public async componentDidMount() {

        this.subscription = AppState.addEventListener('change', async nextAppState => {
            if (this.state.appState.match(/inactive|background/) && nextAppState === 'active'
            ) {
                console.log('App has come to the foreground!');
                await AuthVerify.executeRefresh();
            }

            this.setState({ appState: nextAppState });
            this.setState({ appStateVisible: this.state.appState });
            console.log('AppState', this.state.appState);

            if (this.state.appState === 'background') {
                AuthVerify.socket?.disconnect();
            }
        });

        AuthVerify.newEvent.on('isExpired', (res) => {
            if (res) {
                console.log('isExpired',res)
                this.props.navigation.navigate('Loading');
            }
        })

    }

    render() {
        const hapticOptions = {
            enableVibrateFallback: false,
            ignoreAndroidSystemSettings: true,
        };

        const hapticTriggerType: HapticFeedbackTypes = Platform.select({
            ios: 'notificationSuccess',
            android: 'impactMedium'
        }) as HapticFeedbackTypes;
        const Tab = createBottomTabNavigator();
        return (
            <Tab.Navigator screenOptions={({ route }) => ({
                tabBarActiveTintColor :'#32404e',
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Settings') {
                        iconName = faLayerGroup
                    } else {
                        iconName = faCircleDot;
                    }
                    return <FontAwesomeIcon icon={iconName} size={30} color={focused ? '#32404e' : 'grey'} />
                },
            })}>
                <>
                    <Tab.Screen name="Cycles_APP" options={{
                        title: 'Cycles',
                        headerTintColor: '#32404e',
                        headerTitleStyle: {
                            fontSize: 20,
                            fontWeight: 'bold',
                        },
                        headerShown: false, headerRight: (props) => (
                            <NativeBaseProvider>
                                <Box>
                                    <IconButton size={30}
                                        onPress={() => { ReactNativeHapticFeedback.trigger(hapticTriggerType, hapticOptions); }}
                                        icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#32404e'} style={{ marginRight: 20 }} />}
                                    />
                                </Box>
                            </NativeBaseProvider>
                        )
                    }} component={CycleNavigation} />
                    <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true }} />
                </>
            </Tab.Navigator>
        );
    }

    componentWillUnmount() {
        this.subscription.remove();
    }
}

export default Clv;

