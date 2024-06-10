import { AppState, Platform, Text } from "react-native";
import { AuthVerify } from "../common/AuthVerify";
import React, { useCallback, useEffect } from "react";
import { Box, Button, HStack, IconButton, Image, NativeBaseProvider, Progress, ScrollView, VStack, View } from "native-base";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { deleteProfile, getAllProfiles } from "../common/RememberMeManager";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SvgUri } from "react-native-svg";
import Logo from "../../../../hydrophyto.svg";
import { navigationHeader } from "../common/navigationHeaders";
import { BLEService } from "../../screens/cycle/BLEService";

const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

export function DeviceScreen({ navigation, route }) {
    const [devices, setDevices] = React.useState();

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

    const nav = useNavigation();
    useEffect(() => {
        nav.setOptions({
            headerRight: () => navigationHeader(() => navigation.goBack(), 'arrow-alt-circle-left', false),
            headerLeft: () => (
                <View marginBottom={150}>
                    <Logo width={"35"} height={"35"} />
                </View>
            )
        });


    }, []);

    useFocusEffect(
        useCallback(() => {
            const devices = async () => {
                const devices = await BLEService.ScanBleDevices()
                setDevices(devices);
            }
            devices();
        }, [])
    )

    return (
        <NativeBaseProvider>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} >
                <Text style={{ color: '#32404e', fontSize: 15, fontWeight: 'bold' }}>
                    Select the device to configure :
                </Text>
            </View>

            <View style={{ flex: 2, justifyContent: 'center', alignItems: 'center' }} >

                <ScrollView showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}>



                    {devices ? devices.map((device, index) =>
                        <VStack key={index} marginTop={2} style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <View
                                style={{
                                    width: 45,
                                    height: 45,
                                    borderRadius: 0.5 * 45,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderColor: '#32404e',
                                    borderWidth: 2,
                                }}>
                                <IconButton icon={<Icon name="bluetooth-b" size={20} color='#32404e' />}
                                    onPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        navigation.navigate('deviceSettings', { deviceId: device.id });
                                    }} />
                            </View>
                            <Text style={{ color: '#32404e', fontSize: 15, marginLeft: 5 }}>
                                {device.localName}
                            </Text>
                        </VStack>

                    ) : (<Text style={{ color: '#32404e', fontSize: 15, marginLeft: 5 }}>
                        Scan in progress ...
                    </Text>)}

                </ScrollView>
            </View>

            <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>
                <IconButton alignSelf='center' size={35} icon={<Icon name="search" size={30} color='#32404e' />}
                    onPress={async () => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        console.log('open execution settings');
                        setDevices(undefined);
                        const devices = await BLEService.ScanBleDevices()
                        setDevices(devices);
                    }} />
                <Text style={{ color: '#32404e', fontSize: 15 }}>
                    Scan network
                </Text>
            </VStack>
        </NativeBaseProvider >
    )
}