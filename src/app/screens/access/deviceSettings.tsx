import React, { useEffect } from "react";
import { StyleSheet, Text, Alert } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../data/cycleTypes";
import { Box, Button, IconButton, Input, NativeBaseProvider, VStack, View } from "native-base";
import Spinner from "react-native-loading-spinner-overlay";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from "@react-navigation/native";
import { navigationHeader } from "../../components/common/navigationHeaders";
import { BLEService } from "../../../module/ble/BLEService";

export function DeviceSettings(props: any) {

    const [psk, setPsk] = React.useState('');
    const [ssid, setSsid] = React.useState('');
    const [country, setCountry] = React.useState('FR');
    const [isLoading, setIsLoading] = React.useState(false);



    const nav = useNavigation();
    useEffect(() => {
        nav.setOptions({
            headerLeft: () => navigationHeader(() => props.navigation.goBack(), 'arrow-alt-circle-left', false),
        });
    }, []);



    const onLogin = async (deviceId: string) => {
        const Buffer = require("buffer").Buffer;
        const data = { ssid: ssid, psk: psk, country: country };

        const dataStr = JSON.stringify(data);
        let encodedAuth = new Buffer(dataStr).toString("base64");
        await BLEService.connectToDevice(deviceId)
            .then(async () => {
                await BLEService.discoverAllServicesAndCharacteristicsForDevice()
                console.log('discoverAllServicesAndCharacteristicsForDevice');
            })
            .then(async (device) => {
                await BLEService.writeCharacteristicWithResponseForDevice(
                    '22222222-3333-4444-5555-666666666666',
                    '22222222-3333-4444-5555-666666666669',
                    encodedAuth // binary test133
                );

              const t =  await BLEService.readCharacteristicForDevice('22222222-3333-4444-5555-666666666666',
                    '22222222-3333-4444-5555-666666666668');
                console.log("bleutooth response",t);
            }).then(async () => {
                await BLEService.disconnectDeviceById(deviceId);
            });
    }

    return (
        <NativeBaseProvider>

            <View style={{ flex: 1, marginTop: 50 }}>
                <View alignItems="center" >
                    <View
                        style={{
                            width: 70,
                            height: 70,
                            borderRadius: 0.5 * 70,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderColor: '#32404e',
                            borderWidth: 7,
                        }}>
                        <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" fontWeight={'bold'} icon={<Icon name="bluetooth-b" size={35} color='#32404e' />} />
                    </View>
                </View>
                <VStack space={2} my={1} alignSelf="stretch" shadow={3}>
                    <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" padding={5} >

                        <VStack space={2} alignItems="center">
                            <Spinner visible={isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} />
                            <Input value={country} height="50"
                                placeholder='Country' style={{ fontSize: 20 }}
                                onChangeText={(value) => {
                                    setCountry(value)
                                }} />
                            <Input value={ssid} height="50" textContentType={'username'}
                                placeholder='SSID' style={{ fontSize: 20 }}
                                onChangeText={(value) => {
                                    setSsid(value)
                                }} />
                            <Input height="50"
                                style={{ fontSize: 20 }}
                                placeholder="Psk"
                                secureTextEntry={true}
                                textContentType={'newPassword'}
                                value={psk}
                                onChangeText={(value) => {
                                    setPsk(value)
                                }} />

                            <Button alignSelf='stretch' height='50' backgroundColor='#32404e'
                                onPress={async () => {
                                    setIsLoading(true);
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    if (props.route.params?.deviceId) {
                                        console.log(props.route.params?.deviceId)
                                        console.log(country);
                                        console.log(ssid);
                                        console.log(psk);

                                    }
                                    await onLogin(props.route.params?.deviceId);
                                    setIsLoading(false);
                                    Alert.alert('wifi setting on box done with success');
                                    props.navigation.navigate('Loading');
                                }} >
                                <Text style={{ color: 'white', fontSize: 20 }}> Configure </Text>
                            </Button>
                        </VStack>
                    </Box>
                </VStack>
            </View>


        </NativeBaseProvider>


    );

}



const styles = StyleSheet.create({
    spinnerTextStyle: {
        color: '#32404e',
        fontSize: 15,
        marginBottom: 50
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
    buttonOpen: {
        backgroundColor: '#F194FF',
    },
    buttonClose: {
        backgroundColor: '#2196F3',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    }
});