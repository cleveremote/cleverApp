import React from "react";
import { StyleSheet, Text, Modal, Alert, Pressable, } from "react-native";
import { login } from "../../../module/process/infrasctructure/store/actions/processActions";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../data/cycleTypes";
import { Button, HStack, IconButton, Image, Input, NativeBaseProvider, Switch, VStack, View } from "native-base";
import Spinner from "react-native-loading-spinner-overlay";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { getSigninData, saveSigninData } from "../common/RememberMeManager";
import Logo from "../../../../hydrophyto.svg";

export function SignIn({ navigation, route }) {

    const [signinData, setSigninData] = React.useState({ login: '', password: '', rememberCredentials: false, profile: '' });
    const [isLoading, setIsLoading] = React.useState(false);
    const [modalVisible, setModalVisible] = React.useState(false);


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

        if (route.params?.profile) {
            fetchCredentials(route.params.profile);
        }

    }, []);


    const onPress = () => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        setOpened(!isOpened)
    };

    const [isOpened, setOpened] = React.useState(false);
    const [message, setMessage] = React.useState("");




    const onLogin = async (data: any) => {
        setIsLoading(true);
        await saveSigninData(data.profile, data.login, data.password, data.rememberCredentials, route.params?.profile);
        const res = await login({ login: data.login, password: data.password });
        if (!res.error) {
            navigation.navigate('Clv');
            setIsLoading(false);
        } else {
            Alert.alert(res.error);
            setIsLoading(false);
            setModalVisible(true);
        }
        //manage errors

    }

    return (
        <NativeBaseProvider>
           <View style={{ flex: 1, marginTop: 100 }}>
                <VStack space={4} alignItems="center">
                    <Spinner visible={isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} />
                    <View alignItems="center" marginTop={35}>
                        <Logo width={"70"} height={"70"} />
                    </View>
                    <Input value={signinData.rememberCredentials ? signinData.profile : undefined} height="50"
                        placeholder='Profile' marginLeft="10" marginRight="10" style={{ fontSize: 20 }}
                        onChangeText={(profile) => {
                            setSigninData({ login: signinData.login, password: signinData.password, rememberCredentials: signinData.rememberCredentials, profile })
                        }} />
                    <Input value={signinData.rememberCredentials ? signinData.login : undefined} height="50" textContentType={'username'}
                        placeholder='Box id' marginLeft="10" marginRight="10" style={{ fontSize: 20 }}
                        onChangeText={(login) => {
                            setSigninData({ login, password: signinData.password, rememberCredentials: signinData.rememberCredentials, profile: signinData.profile })
                        }} />
                    <Input height="50"
                        marginLeft="10" marginRight="10" style={{ fontSize: 20 }}
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

                    <Button alignSelf='stretch' height='50' marginLeft="10" marginRight="10" backgroundColor='#32404e'
                        onPress={async () => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            await onLogin(signinData);
                        }} >
                        <Text style={{ color: 'white', fontSize: 20 }}> Signin </Text>
                    </Button>
                </VStack>



            </View>

            <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>
                <IconButton alignSelf='center' size={35} icon={<Icon name={'arrow-alt-circle-left'} size={30} color='#32404e'/>}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        navigation.navigate('Loading')
                    }} />
                <Text style={{ color: '#32404e', fontSize: 15 }}>back to profiles</Text>
            </VStack>


            {/* <ModalOverrideDuration message={message} modalVisible={modalVisible}
                onClose={() => {
                    setModalVisible(!modalVisible);
                }}
                onConfirm={(ms: number) => {
                    onPress();
                }} /> */}


        </NativeBaseProvider>


    );

}

function ModalOverrideDuration({ message, modalVisible, onClose, onConfirm }: { message: string, modalVisible: boolean, onClose: () => void, onConfirm: (ms: number) => void }) {
    const cancelRef = React.useRef(null);
    const [text, setText] = React.useState('');
    return (
        <View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={onClose}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalText}>Hello World!</Text>
                        <Pressable
                            style={[styles.button, styles.buttonClose]}
                            onPress={onClose}>
                            <Text style={styles.textStyle}>Hide Modal</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </View>

        // <AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
        //     <AlertDialog.Content>
        //         {/* <AlertDialog.CloseButton /> */}
        //         {/* <AlertDialog.Header>Override duration</AlertDialog.Header> */}
        //         <AlertDialog.Body>
        //             {message}
        //             <Button variant="unstyled" colorScheme="coolGray" onPress={onClose} ref={cancelRef}>
        //                 OK
        //             </Button>
        //             {/* please enter duration in (ms) to override default sequences duration
        //             <Input defaultValue={text} onChangeText={newText => setText(newText)}></Input> */}
        //         </AlertDialog.Body>
        //         {/* <AlertDialog.Footer>
        //             <Button.Group space={2}>

        //                 <Button colorScheme="info" onPress={()=>onConfirm(Number(text))}>
        //                     execute
        //                 </Button>
        //             </Button.Group>
        //         </AlertDialog.Footer> */}
        //     </AlertDialog.Content>
        // </AlertDialog>


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