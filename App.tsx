import * as React from 'react';
import { Button, Platform, Text, View, StatusBar, LogBox } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Provider } from 'react-redux';
import { store } from './src/module/process/infrasctructure/store/store';
import { Box, Center, CheckIcon, IconButton, NativeBaseProvider, ScrollView, Select, VStack } from 'native-base';
import { CycleNavigation } from './src/app/navigations/cycleNavigation';
import { faCircleDot, faLayerGroup, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
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

const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

function SettingsScreen({ navigation }) {
    return (
        <NativeBaseProvider>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',height:'50%' }} >
                <Text>Settings screen</Text>
                <Center flex={1} px="3">
                    <Example />
                </Center>
            </View>
        </NativeBaseProvider>
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

                        if (route.name === 'Settings') {
                            iconName = faLayerGroup
                        } else {
                            iconName = faCircleDot;
                        }
                        return <FontAwesomeIcon icon={iconName} size={30} color={focused ? '#60a5fa' : 'grey'} />
                    },
                })}>
                    <Tab.Screen name="Cycles_APP" options={{
                        title: 'Cycles',
                        headerTintColor: '#60a5fa',
                        headerTitleStyle: {
                            fontSize: 20,
                            fontWeight: 'bold',
                        },
                        headerShown: false, headerRight: (props) => (
                            <NativeBaseProvider>
                                <Box>
                                    <IconButton size={30}
                                        onPress={() => { ReactNativeHapticFeedback.trigger(hapticTriggerType, hapticOptions); }}
                                        icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} style={{ marginRight: 20 }} />}
                                    />
                                </Box>
                            </NativeBaseProvider>

                        )
                    }} component={CycleNavigation} />
                    <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true }} />
                </Tab.Navigator>
            </NavigationContainer>
        </Provider>
    );
}

const Example = () => {
    let [language, setLanguage] = React.useState("");
    return  <ScrollView>
    
    <VStack alignItems="center" space={4}>
        <Select paddingTop={100} _actionSheetContent={{maxHeight:'2xl'}}  minWidth={200} position="relative" accessibilityLabel="Select your favorite programming language" placeholder="Select your favorite programming language" onValueChange={itemValue => setLanguage(itemValue)} _selectedItem={{
            bg: "cyan.600",
            endIcon: <CheckIcon size={4} />
        }}>
            <Select.Item label="JavaScript" value="js"  />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
            <Select.Item label="JavaScript" value="js" />
            <Select.Item label="TypeScript" value="ts" />
            <Select.Item label="C" value="c" />
            <Select.Item label="Python" value="py" />
            <Select.Item label="Java" value="java" />
        </Select>
    </VStack>
    </ScrollView>;
};

export function settingsButton() {
    const navigation = useNavigation();
    return (
        <NativeBaseProvider>
            <IconButton
                size={22}
                onPress={() => {
                    navigation.navigate({ key: "Details" });
                }}
                icon={
                    <Icon name="cog" size={22} color='red' />
                }
            />
        </NativeBaseProvider>
    );
}
