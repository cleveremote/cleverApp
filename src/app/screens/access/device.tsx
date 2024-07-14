import { Text } from "react-native";
import React, { useCallback, useEffect } from "react";
import { IconButton, NativeBaseProvider, ScrollView, VStack, View } from "native-base";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { navigationHeader } from "../../components/common/navigationHeaders";
import { BLEService } from "../../../module/ble/BLEService";
import { hapticOptions } from "../../data/cycleTypes";
import { Device } from "react-native-ble-plx";


export function DeviceScreen(props: any) {
    const [devices, setDevices] = React.useState<Device[]>([]);

    const nav = useNavigation();
    useEffect(() => {
        nav.setOptions({
            headerLeft: () => navigationHeader(() => props.navigation.goBack(), 'arrow-alt-circle-left', false),
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



                    {devices.length ? devices.map((device, index) =>
                        <VStack key={'item_' + index} marginTop={2} style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <View
                                style={{
                                    width: 47,
                                    height: 47,
                                    borderRadius: 0.5 * 47,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderColor: '#0082FC',//'#32404e',
                                    borderWidth: 4,
                                }}>
                                <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" fontWeight={'bold'} icon={<Icon name="bluetooth-b" size={20} color='#0082FC' />}
                                    onPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        props.navigation.navigate('deviceSettings', { deviceId: device.id });
                                    }} />
                            </View>
                            <Text style={{ color: '#0082FC', fontSize: 15, margin: 5, fontWeight: 'bold' }}>
                                device: {device.localName}
                            </Text>
                        </VStack>

                    ) : (<Text style={{ color: '#32404e', fontSize: 15, marginLeft: 5 }}>
                        Scan in progress ...
                    </Text>)}

                </ScrollView>
            </View>

            <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>
                <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" alignSelf='center' size={35} icon={<Icon name="search" size={30} color='#32404e' />}
                    onPress={async () => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        console.log('open execution settings');
                        setDevices([]);
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