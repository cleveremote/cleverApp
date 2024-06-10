import React, { useEffect } from "react";
import { StyleSheet, Text, Modal, Alert, Pressable, } from "react-native";
import { login } from "../../../module/process/infrasctructure/store/actions/processActions";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../data/cycleTypes";
import { Button, HStack, IconButton, Image, Input, NativeBaseProvider, Switch, VStack, View } from "native-base";
import Spinner from "react-native-loading-spinner-overlay";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getSigninData, saveSigninData } from "../common/RememberMeManager";
import Logo from "../../../../hydrophyto.svg";
import { useNavigation } from "@react-navigation/native";
import { navigationHeader } from "../common/navigationHeaders";
import { BLEService } from "../../screens/cycle/BLEService";

export function DeviceSettings({ navigation, route }) {

    const [psk, setPsk] = React.useState();
    const [ssid, setSsid] = React.useState();
    const [country, setCountry] = React.useState();
    const [isLoading, setIsLoading] = React.useState();



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

    React.useEffect(() => {
        const fetchCredentials = async (profile: string) => {
            try {
            } catch (error) {
            }
        };

        // if (route.params?.deviceId) {
        //     console.log(route.params?.deviceId)
        // }
       

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
                const t =  await BLEService.writeCharacteristicWithResponseForDevice(
                    '22222222-3333-4444-5555-666666666666',
                    '22222222-3333-4444-5555-666666666669',
                    encodedAuth // binary test133
                );

                await BLEService.readCharacteristicForDevice('22222222-3333-4444-5555-666666666666',
                    '22222222-3333-4444-5555-666666666668');
                console.log(t);
            }).then(async () => {
                await BLEService.disconnectDeviceById(deviceId);
            });
    }

    return (
        <NativeBaseProvider>
            <View style={{ flex: 1, marginTop: 100 }}>
                <VStack space={4} alignItems="center">
                    <Spinner visible={isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} />
                    <Input value={country} height="50"
                        placeholder='Country' marginLeft="10" marginRight="10" style={{ fontSize: 20 }}
                        onChangeText={(value) => {
                            setCountry(value)
                        }} />
                    <Input value={ssid} height="50" textContentType={'username'}
                        placeholder='SSID' marginLeft="10" marginRight="10" style={{ fontSize: 20 }}
                        onChangeText={(value) => {
                            setSsid(value)
                        }} />
                    <Input height="50"
                        marginLeft="10" marginRight="10" style={{ fontSize: 20 }}
                        placeholder="Psk"
                        secureTextEntry={true}
                        textContentType={'newPassword'}
                        value={psk}
                        onChangeText={(value) => {
                            setPsk(value)
                        }} />

                    <Button alignSelf='stretch' height='50' marginLeft="10" marginRight="10" backgroundColor='#32404e'
                        onPress={async () => {
                            setIsLoading(true);
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            if (route.params?.deviceId) {
                                console.log(route.params?.deviceId)
                                console.log(country);
                                console.log(ssid);
                                console.log(psk);

                            }
                            await onLogin(route.params?.deviceId);
                            setIsLoading(false);
                            Alert.alert('wifi setting on box done with success');
                            navigation.navigate('Loading');
                        }} >
                        <Text style={{ color: 'white', fontSize: 20 }}> Configure </Text>
                    </Button>
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