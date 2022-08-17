import * as React from 'react';
import { Button, Platform, Text, View, StatusBar, LogBox } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Provider } from 'react-redux';
import store from './src/module/process/infrasctructure/store/store';
import CycleList from './src/app/screens/cycleList';
import { Box, IconButton, NativeBaseProvider } from 'native-base';
import CycleNavigation from './src/app/components/cycle/cycleNavigation';
import { faCircleDot as farCircleDot } from '@fortawesome/free-regular-svg-icons';
import { faCircleDot, faCirclePlus, faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faArrowsSpin } from '@fortawesome/free-solid-svg-icons';

import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { OrientationType, useDeviceOrientationChange } from 'react-native-orientation-locker';
import messaging from '@react-native-firebase/messaging';
LogBox.ignoreLogs(['Warning: ...', 'VirtualizedLists should never be nested']); // Ignore log notification by message
LogBox.ignoreAllLogs();

export async function onAppBootstrap() {
    // Register the device with FCM
    console.log('je uazre là');
    await messaging().registerDeviceForRemoteMessages();

    // Get the token
    const token = await messaging().getToken();
    console.log('the token : ', token);
}

function DetailsScreen() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Details!</Text>
        </View>
    );
}
const MyScreen = () => {
    ReactNativeHapticFeedback.trigger("impactLight");
}

function HomeScreen({ navigation }) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Home screen</Text>
            <Button
                title="Go to Details"
                onPress={() => navigation.navigate('Details')}
            />
        </View>
    );
}
const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
});

function SettingsScreen({ navigation }) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Settings screen</Text>
            {settingsButton()}
        </View>
    );
}

const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
    return (
        <HomeStack.Navigator>
            <HomeStack.Screen name="Details" component={DetailsScreen} />
        </HomeStack.Navigator>
    );
}

const Tab = createBottomTabNavigator();
export default function App() {
     onAppBootstrap();
    return (



        <Provider store={store}>
            <StatusBar barStyle={'dark-content'} />
            <NavigationContainer>
                <Tab.Navigator screenOptions={({ route }) => ({
                    activeTintColor: 'tomato',
                    inactiveTintColor: 'gray',
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName;

                        if (route.name === 'Home_Cycles') {
                            iconName = faArrowsSpin;
                        } else if (route.name === 'Settings') {
                            iconName = faLayerGroup
                        } else {
                            iconName = faCircleDot;
                        }
                        return <FontAwesomeIcon icon={iconName} size={30} color={focused ? '#60a5fa' : 'grey'} />
                    },
                })}
                >
                    <Tab.Screen name="Cycles_APP" options={{
                        // header: (props) => (
                        //     <NativeBaseProvider>
                        //         <Box> <Text>nadime</Text></Box>
                        //     </NativeBaseProvider>
                        // ),
                        title: 'Cycles',
                        headerTintColor: '#60a5fa',
                        headerTitleStyle: {
                            fontSize: 20,
                            fontWeight: 'bold',
                        },
                        headerShown: false, headerRight: (props) => (
                            <NativeBaseProvider>
                                <Box>
                                    <IconButton
                                        size={30}
                                        onPress={
                                            () => {
                                                ReactNativeHapticFeedback.trigger(
                                                    'impactMedium', hapticOptions
                                                );
                                                // //console.log(
                                                //     'open execution settings'
                                                // );
                                            }

                                        }
                                        icon={
                                            <FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} style={{ marginRight: 20 }} />
                                        }
                                    />
                                </Box>
                            </NativeBaseProvider>

                        )
                    }} component={CycleNavigation} />
                    {/* options={{headerShown: false}} */}
                    <Tab.Screen name="Settings" component={SettingsScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </Provider>
    );
}

export function settingsButton() {
    // const [landscape, setLandscape] = React.useState(OrientationType.PORTRAIT);

    // useDeviceOrientationChange((o) => {
    //     //console.log('orientation',o);
    //     setLandscape(o);
    // });
    const navigation = useNavigation();
    return (
        <NativeBaseProvider>
            <IconButton
                size={22}
                onPress={() => {

                    navigation.navigate('Details');
                }}
                icon={
                    <Icon
                        name="cog"
                        size={22}
                        color='red' //cycleData.style.iconColor
                    />
                }
            />

        </NativeBaseProvider>


    );
}
