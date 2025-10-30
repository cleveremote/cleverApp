import React, { useEffect } from "react";
import { StyleSheet, Text, Alert } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../data/cycleTypes";
import { Box, Button, CheckIcon, IconButton, Input, NativeBaseProvider, Select, VStack, View } from "native-base";
import Spinner from "react-native-loading-spinner-overlay";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from "@react-navigation/native";
import { navigationHeader } from "../../components/common/navigationHeaders";
import { BLEService } from "../../../module/ble/BLEService";
import { saveSigninData } from "../../components/common/RememberMeManager";
import { decode } from "base-64";

export function DeviceSettings(props: any) {

    const [psk, setPsk] = React.useState('');
    const [ssid, setSsid] = React.useState('1');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [profile, setProfile] = React.useState('New profile');
    const [networks, setNetworks] = React.useState([]);



    const nav = useNavigation();
    useEffect(() => {
        nav.setOptions({
            headerLeft: () => navigationHeader(() => props.navigation.goBack(), 'arrow-alt-circle-left', false),
        });
        setIsLoading(true);
        BLEService.connectToDevice(props.route.params?.deviceId)
            .then( () =>  BLEService.discoverAllServicesAndCharacteristicsForDevice()
            )
            .then( (device) => {
                return BLEService.readCharacteristicForDevice('22222222-3333-4444-5555-666666666666',
                    '22222222-3333-4444-5555-666666666668');
            })
            .then( (result) => {
                if (result.value) {
                    setNetworks(JSON.parse(decode(result.value)).map((x: any) => ({ label: x.name, value: x.name })));
                }
                setIsLoading(false);
                 return BLEService.disconnectDeviceById(props.route.params?.deviceId);
            })
            .catch((error) => {
                Alert.alert(error.message);
                setIsLoading(false);
            })
            

    }, []);



    const onLogin = async (deviceId: string) => {
        setIsLoading(true);
        const Buffer = require("buffer").Buffer;
        const data = { ssid: ssid, psk: psk, password: password };
        const dataStr = JSON.stringify(data);
        let encodedAuth = new Buffer(dataStr).toString("base64");

        await BLEService.connectToDevice(deviceId)
            .then(async () => {
                await BLEService.discoverAllServicesAndCharacteristicsForDevice()
            })
            .then(async (device) => {

                await BLEService.writeCharacteristicWithResponseForDevice(
                    '22222222-3333-4444-5555-666666666666',
                    '22222222-3333-4444-5555-666666666669',
                    encodedAuth
                );
                await saveSigninData(profile, props.route.params?.deviceName, password, true, '');
                props.navigation.navigate('Signin', { profile });
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error caught:", error); // If rejected, this will be executed
                setIsLoading(false);
                Alert.alert('Permission denied: check your password.');
            })
            .then(async () => {
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
                        <IconButton variant="unstyled" fontWeight={'bold'} icon={<Icon name="wifi" size={30} color='#32404e' />} />
                    </View>
                </View>
                <VStack space={2} my={1} alignSelf="stretch" shadow={3}>
                    <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" padding={5} >
                        <VStack space={2} alignItems="center">
                            <Spinner visible={isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} />
                            <Input height="50"
                                style={{ fontSize: 20 }}
                                placeholder="Profile"
                                value={profile}
                                onChangeText={(value) => {
                                    setProfile(value)
                                }} />
                            <Select defaultValue={''} height="50" fontSize={20} width={'100%'}
                                placeholder='WiFi Network'
                                _selectedItem={{ bg: "blue.400", endIcon: <CheckIcon size="5" /> }} my={1}
                                onValueChange={value => {
                                    setSsid(value)
                                }}>
                                {networks.map((item, index) => <Select.Item key={'action_' + index} label={`${item.label}`} value={`${item.value}`} />)}
                            </Select>
                            <Input height="50"
                                style={{ fontSize: 20 }}
                                placeholder="Psk"
                                secureTextEntry={true}
                                textContentType={'newPassword'}
                                value={psk}
                                onChangeText={(value) => {
                                    setPsk(value)
                                }} />
                            <Input height="50"
                                style={{ fontSize: 20 }}
                                placeholder="Password"
                                secureTextEntry={true}
                                textContentType={'newPassword'}
                                value={password}
                                onChangeText={(value) => {
                                    setPassword(value)
                                }} />
                            <Button alignSelf='stretch' height='50' backgroundColor={(!(ssid && psk && password) ? '#a5a4a5' : '#32404e')} disabled={!(ssid && psk && password)}
                                onPress={async () => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    await onLogin(props.route.params?.deviceId);
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