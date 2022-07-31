import * as React from 'react';
import { Button, Platform, Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Provider } from 'react-redux';
import store from './src/module/process/infrasctructure/store/store';
import processList from './src/app/components/processList';
import { IconButton, NativeBaseProvider } from 'native-base';
import processNavigation from './src/app/components/processNavigation';

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
            {/* <Button title="Learn More4"
                color="#841584"
                accessibilityLabel="Learn more about this purple button"
                onPress={() => {
                    console.log('test 123');
                    ReactNativeHapticFeedback.trigger(hapticTriggerType, hapticOptions)
                }} /> */}
            {/* <Button
        title="Go to Details"
        onPress={() => navigation.navigate('Details')}
      /> */}
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

const SettingsStack = createNativeStackNavigator();

function SettingsStackScreen() {
    return (
        <SettingsStack.Navigator >
            <SettingsStack.Screen name="Settings" component={SettingsScreen} />
            <SettingsStack.Screen name="Details" component={DetailsScreen} />
        </SettingsStack.Navigator>
    );
}

const Tab = createBottomTabNavigator();
export default function App() {
    return (
        <Provider store={store}>
            <NavigationContainer>
                <Tab.Navigator screenOptions={({ route }) => ({
                    activeTintColor: 'tomato',
                    inactiveTintColor: 'gray',
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName;

                        if (route.name === 'Home') {
                            iconName = focused
                                ? 'ios-information-circle'
                                : 'ios-information-circle-outline';
                        } else if (route.name === 'Settings') {
                            iconName = focused ? 'ios-list-box' : 'ios-list';
                        }
                        return <Icon name="rocket" size={30} color="#900" />
                        // You can return any component that you like here!
                        //return <Icon name="facebook" size={size} color={color} />;
                    },
                })}
                >
                    <Tab.Screen  name="Cycles" component={processNavigation} /> 
                    {/* options={{headerShown: false}} */}
                    <Tab.Screen name="Settings" component={SettingsScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </Provider>
    );
}

export function settingsButton() {
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
