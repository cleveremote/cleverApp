import React from "react";
import { StyleSheet, Text, Alert } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../data/cycleTypes";
import { Box, Button, HStack, IconButton, Input, NativeBaseProvider, Switch, VStack, View } from "native-base";
import Spinner from "react-native-loading-spinner-overlay";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getSigninData } from "../../components/common/RememberMeManager";
import Logo from "../../../../hydrophyto.svg";
import { connect } from "react-redux";
import { login, setIsConnected } from "../../../module/process/infrasctructure/store/actions/state";

export function SignIn(props: any) {

    const [signinData, setSigninData] = React.useState({ login: '', password: '', rememberCredentials: false, profile: '' });
    const [isLoading, setIsLoading] = React.useState(false);


    React.useEffect(() => {
        const fetchCredentials = async (profile: string) => {
            try {
                const sd = await getSigninData(profile);
                if (sd) {
                    setSigninData(sd);
                    if (sd.login && sd.password && sd.profile) {
                        await onLogin(sd);
                    } else {
                        Alert.alert('Required information missing!');
                    }

                }
            } catch (error) {
                console.error('Error fetching checkValue or email:', error);
            }
        };

        if (props.route.params?.profile) {
            fetchCredentials(props.route.params.profile);
        }

    }, []);

    const onLogin = async (data: any) => {
        setIsLoading(true);
        props.login(data.login, data.password, data.rememberCredentials, data.profile, props.route.params?.profile).then((res: any) => {
            console.log('props.login')
            if (res.error) {
                Alert.alert(res.error);
                setIsLoading(false);
            }
        });

    }

    return (
        <NativeBaseProvider>

            <View style={{ flex: 1, marginTop: 50 }}>
                <VStack space={4} alignItems="center">
                    <Spinner visible={isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} />
                    <View alignItems="center" marginTop={35}>
                        <Logo width={"70"} height={"70"} />
                    </View>
                    <VStack space={2} my={1} alignSelf="stretch" shadow={3}>
                        <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" padding={5} >
                            <VStack space={2}>
                                <Input value={signinData.rememberCredentials ? signinData.profile : undefined} height="50"
                                    placeholder='Profile' style={{ fontSize: 20 }}
                                    onChangeText={(profile) => {
                                        setSigninData({ login: signinData.login, password: signinData.password, rememberCredentials: signinData.rememberCredentials, profile })
                                    }} />
                                <Input value={signinData.rememberCredentials ? signinData.login : undefined} height="50" textContentType={'username'}
                                    placeholder='Box id' style={{ fontSize: 20 }}
                                    onChangeText={(login) => {
                                        setSigninData({ login, password: signinData.password, rememberCredentials: signinData.rememberCredentials, profile: signinData.profile })
                                    }} />
                                <Input height="50"
                                    style={{ fontSize: 20 }}
                                    placeholder="Password"
                                    secureTextEntry={true}
                                    textContentType={'newPassword'}
                                    value={signinData.rememberCredentials ? signinData.password : undefined}
                                    onChangeText={(password) => {
                                        setSigninData({ login: signinData.login, password, rememberCredentials: signinData.rememberCredentials, profile: signinData.profile })
                                    }} />

                                <HStack marginLeft="10" marginRight="10" alignSelf='center'>
                                    <Switch marginRight="3" isChecked={signinData.rememberCredentials} onTrackColor={'#32404e'} offThumbColor={'blueGray.50'} size={'md'}
                                        onValueChange={(checked) => {
                                            setSigninData({ login: signinData.login, password: signinData.password, rememberCredentials: checked, profile: signinData.profile });
                                        }}
                                    />
                                    <Text style={{ marginTop: 5, color: '#32404e', fontSize: 15 }}> Remember me</Text>
                                </HStack>
                                <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>
                                    <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" alignSelf='center' size={35} icon={<Icon name={'id-badge'} size={30} color='#32404e' />}
                                        onPress={() => {
                                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                            props.navigation.goBack();
                                        }} />
                                    <Text style={{ color: '#32404e', fontSize: 15 }}>back to profiles</Text>
                                </VStack>

                                <Button alignSelf='stretch' height='50' backgroundColor='#32404e'
                                    onPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        await onLogin(signinData);
                                    }} >
                                    <Text style={{ color: 'white', fontSize: 20 }}> Signin </Text>
                                </Button>
                            </VStack>
                        </Box>
                    </VStack>
                </VStack>

            </View>

            <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>
                <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" alignSelf='center' size={35} icon={<Icon name={'arrow-alt-circle-left'} size={30} color='#32404e' />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        props.navigation.goBack();
                    }} />
                <Text style={{ color: '#32404e', fontSize: 15 }}>back to profiles</Text>
            </VStack>



        </NativeBaseProvider>


    );

}
const mapStateToProps = function (state: any) {
    return {
        isConnected: state.status?.isConnected
    }
}

export default connect(mapStateToProps, {
    login,
    setIsConnected
})(SignIn);

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