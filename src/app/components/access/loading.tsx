import { AppState, Platform, Text } from "react-native";
import { AuthVerify } from "../common/AuthVerify";
import React, { useCallback } from "react";
import { Box, HStack, IconButton, Image, NativeBaseProvider, Progress, ScrollView, VStack, View } from "native-base";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { deleteProfile, getAllProfiles } from "../common/RememberMeManager";
import { useFocusEffect } from "@react-navigation/native";
import { SvgUri } from "react-native-svg";
import Logo from "../../../../hydrophyto.svg";

const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

export function LoadingScreen({ navigation, route }) {
    const [profiles, setProfiles] = React.useState([]);

    // const [running, setRunning] = React.useState(true);

    // const appState = React.useRef(AppState.currentState);
    // let timerId: NodeJS.Timeout;
    // React.useEffect(() => {
    //     if (running) {
    //         timerId = setInterval(() => {
    //             setProgression(progression => progression + 1);
    //         }, 10);
    //     } else {
    //         clearInterval(timerId);
    //         AuthVerify.executeRefresh().then(() => { });
    //     }
    // }, [running]);



    useFocusEffect(
        useCallback(() => {
            const profiles = async () => {
                const profiles = await getAllProfiles();
                setProfiles(profiles);
            }
            profiles();
        }, [])
    )

    return (
        <NativeBaseProvider>
            <View alignItems="center" marginTop={35}>
                <Logo width={"70"} height={"70"} />
                <Text style={{ color: '#32404e', fontSize: 20, fontWeight:'bold'}}>
                    HYDRO-PHYTO
                </Text>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>


                <ScrollView showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}  >
                    <View style={{ alignItems: 'center' }} >
                        {profiles.map((profile) =>
                            <Box  >
                                <IconButton icon={<Icon name="server" size={40} color='#32404e' />}
                                    onLongPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        await deleteProfile(profile);
                                        const profiles = await getAllProfiles();
                                        setProfiles(profiles);
                                    }}
                                    onPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        navigation.navigate('Signin', { profile });
                                    }} /><Text style={{ color: '#32404e', fontSize: 15 }}>
                                    {profile}
                                </Text>
                            </Box>
                        )}
                        <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <IconButton marginTop={5} style={{ transform: [{ rotate: '135deg' }] }} size={30} icon={<Icon name={'times-circle'} size={30} color='#32404e' />}
                                onPress={async () => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    navigation.navigate('Signin');
                                }} />
                            <Text style={{ color: '#32404e', fontSize: 15 }}>
                                Add new box ...
                            </Text>
                        </VStack>
                        <Text style={{ color: '#32404e', fontSize: 15 }}>
                            (Long press to delete)
                        </Text>
                    </View>
                </ScrollView>
            </View>

            <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>

                <IconButton alignSelf='center' size={30} icon={<Icon name="wifi" size={25} color='#32404e' />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        console.log('open execution settings');
                        navigation.navigate('Device');
                    }} />
                <Text style={{ color: '#32404e', fontSize: 15 }}>
                    Connectivity settings
                </Text>
            </VStack>


            {/* <View style={{ flex: 1, justifyContent: 'center', }} >
                <IconButton alignSelf='center' size={40} icon={<Icon name="server" size={40} color='#32404e' />}>
                    <VStack alignItems="center">
                        <Image source={require('../../../../login.png')} />
                    </VStack>
                    <Progress size="xs" value={progression} rounded="xl" _filledTrack={{ bg: '#60a5fd' }} />
            </View> */}
        </NativeBaseProvider>
    )
}