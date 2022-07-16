import React from 'react';
import {
    Flex,
    Divider,
    Text,
    ScrollView,
    VStack,
    Center,
    NativeBaseProvider,
    Icon,
    Switch,
    IconButton,
    Box,
    View,
    Heading,
    Button,
} from 'native-base';
import { faRedo,faArrowAltCircleDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { Platform,Vibration } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {sendMessage} from '../../module/common/websocket';
import IO from 'socket.io-client';

const fontAwesome = {
    iconFamily: 'FontAwesome',
    iconFontSize: (Platform.OS === 'ios') ? 30 : 28,
    iconMargin: 7,
    iconLineHeight: (Platform.OS === 'ios') ? 37 : 30,
}

const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
  };
  
  ReactNativeHapticFeedback.trigger("impactLight", options);


export function testcoMPOSANT() {
    return (
        <NativeBaseProvider >
            <Center flex={1} px="3">
                <ScrollView
                    alignSelf="stretch"
                    h="80"
                    _contentContainerStyle={{
                        px: '20px',
                        mb: '4',
                        minW: '72',
                    }}>
                    <VStack space={2} alignItems="center" alignSelf="stretch">
                        <Center
                            alignItems="flex-end"
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}>
                            <Icon as={FontAwesomeIcon} icon={faRedo} />
                        </Center>
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}>
                        </Center>

                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}>
                            <View style={{ flexDirection: 'row' }}>
                                <Box>
                                    <Flex direction="row" h="62" p="4">
                                        <IconButton icon={<Icon as={FontAwesomeIcon} icon={faArrowAltCircleDown} />} borderRadius="full" _icon={{
                                            color: 'coolGray.50',
                                            size: 'md'
                                        }} _hover={{
                                            bg: 'coolGray.800:alpha.20'
                                        }} _pressed={{
                                            bg: 'coolGray.800:alpha.20',
                                            _icon: {
                                                name: 'emoji-flirt'
                                            },
                                            _ios: {
                                                _icon: {
                                                    size: 'md'
                                                }
                                            }
                                        }} _ios={{
                                            _icon: {
                                                size: 'md'
                                            }
                                        }} />
                                        <Divider
                                            bg="emerald.500"
                                            thickness="2"
                                            mx="-1"
                                            orientation="vertical"
                                        />
                                        <IconButton
                                            onPress={() => {
                                                ReactNativeHapticFeedback.trigger("impactLight", options);
                                               //Vibration.vibrate();
                                                console.log('ça marche');
                                            }}

                                            icon={<Icon as={FontAwesomeIcon} icon={faRedo} />} borderRadius="full" _icon={{
                                                color: 'coolGray.50',
                                                size: 'md'
                                            }} _hover={{
                                                bg: 'coolGray.800:alpha.20'
                                            }} _pressed={{
                                                bg: 'coolGray.800:alpha.20',
                                                _icon: {
                                                    name: 'emoji-flirt'
                                                },
                                                _ios: {
                                                    _icon: {
                                                        size: 'md'
                                                    }
                                                }
                                            }} _ios={{
                                                _icon: {
                                                    size: 'md'
                                                }
                                            }} />
                                        <Divider
                                            bg="indigo.100"
                                            thickness="2"
                                            mx="-1"
                                            orientation="vertical"
                                        />
                                    </Flex>
                                </Box>

                                <Box style={{ flex: 2, alignItems: 'center' }}>
                                    <Flex direction="row" h="62" p="3" style={{ textAlign: 'flex-end' }}>
                                        <Heading size="sm" alignSelf="center">
                                            Irrigitation
                                        </Heading>
                                    </Flex>
                                </Box>

                                <Box style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Flex direction="row" h="62" p="4">
                                        <Switch defaultIsChecked colorScheme="emerald" size="md" />
                                    </Flex>
                                </Box>
                            </View>
                        </Center>
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        >
                            <Box alignItems="center">
      <Button onPress={() => {
        const socket = IO('http://192.168.1.15:5001', {
            forceNew: true,
        });
        socket.on('connection', () => console.log('Connection'));
        ReactNativeHapticFeedback.trigger("impactLight", options);
      }}>Click Me</Button>
    </Box>
                            </Center>
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.300"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.500"
                            rounded="md"
                            shadow={5}
                        />
                        <Center
                            alignSelf="stretch"
                            h="20"
                            bg="indigo.700"
                            rounded="md"
                            shadow={5}
                        />
                    </VStack>
                </ScrollView>
            </Center>
        </NativeBaseProvider>
    );
}

