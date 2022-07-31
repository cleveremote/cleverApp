import React from 'react';
import {
    Flex,
    ScrollView,
    VStack,
    Center,
    Switch,
    IconButton,
    Box,
    View,
    Heading,
    Progress,
    Button,
    HStack,
    Stagger,
    useDisclose
} from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native-svg';


const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};

export function testcoMPOSANT(cycleData: any, navigation) {

    return (

        <Center alignSelf="stretch" key={cycleData.id}>
            <ScrollView
                alignSelf="stretch"
                _contentContainerStyle={{ px: '3', m: '1' }}>
                <VStack space={3} alignItems="center" alignSelf="stretch">
                    
                    <Box
                        alignSelf="stretch"
                        bg={cycleData.style.bgColor}
                        rounded="md"
                        shadow={5}>
                        <View style={{ flexDirection: 'row' }} mt="3" mb="3">
                            <Box zIndex={2}
                                style={{ flex: 1, alignItems: 'flex-start' }}
                                px="1">
                                <Flex direction="row">
                                    {/* <IconButton
                                        size={21}
                                        onPress={() => {

                                            navigation.navigate('Schedule');
                                            ReactNativeHapticFeedback.trigger(
                                                'impactMedium',
                                                options
                                            );
                                            console.log(
                                                'open execution settings'
                                            );
                                        }}
                                        icon={
                                            <Icon
                                                name="bolt"
                                                size={21}
                                                color={cycleData.style.iconColor}
                                            />
                                        }
                                    /> */}
                                    <Example navigation={navigation} />
                                </Flex>
                            </Box>

                            <Box style={{ flex: 5, alignItems: 'center' }}>
                                <Heading
                                    size="sm"
                                    alignSelf="center"
                                    color={cycleData.fontColor}
                                    numberOfLines={1}
                                    ellipsizeMode="tail">
                                    {cycleData.name}
                                    <Switch
                                        defaultIsChecked
                                        onTrackColor={cycleData.style.iconColor + ".200"} onThumbColor={cycleData.style.iconColor + ".500"} offThumbColor={cycleData.style.iconColor + ".50"}
                                        size={'sm'}
                                    />
                                </Heading>
                            </Box>

                            <Box style={{ alignItems: 'flex-end' }} px="1">
                                {/* <IconButton
                                    size={22}
                                    onPress={() => {
                                        ReactNativeHapticFeedback.trigger(
                                            'impactMedium',
                                            options
                                        );
                                        console.log('open settings');
                                    }}
                                    icon={
                                        <Icon
                                            name="cog"
                                            size={22}
                                            color={cycleData.style.iconColor}
                                        />
                                    }
                                /> */}
                                {/* {settingsButton(cycleData.style.iconColor)} */}
                            </Box>
                        </View>

                        <Center alignSelf="stretch" mb="3">
                            <View style={{ flexDirection: 'row' }}>
                                <Heading
                                    size="xs"
                                    alignSelf="center"
                                    color="{cycleData.fontColor}"
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    ml="2">
                                    01:12:45
                                </Heading>
                                <Box
                                    style={{ flex: 9, alignItems: 'center' }}
                                    mt={1}>
                                    <Flex direction="row" px="2">
                                        <Box style={{ flex: 5 }}>
                                            <Progress
                                                size="md"
                                                rounded="md"
                                                value={10}
                                                mx="1"
                                                _filledTrack={{ bg: cycleData.style.iconColor }}
                                            />
                                        </Box>
                                    </Flex>
                                </Box>

                                <Box style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Flex direction="row" px="1">
                                        <IconButton
                                            size={21}
                                            onPress={() => {
                                                ReactNativeHapticFeedback.trigger(
                                                    'impactMedium',
                                                    options
                                                );
                                                console.log('get information');
                                            }}
                                            icon={
                                                <Icon
                                                    name="info-circle"
                                                    size={21}
                                                    color={cycleData.style.iconColor}
                                                />
                                            }
                                        />
                                    </Flex>
                                </Box>
                            </View>
                        </Center>
                    </Box>
                </VStack>
            </ScrollView>
        </Center>
    );
}

export function settingsButton(iconColor) {
    const navigation = useNavigation();
    return (
        <IconButton
            size={22}
            onPress={() => {
                ReactNativeHapticFeedback.trigger(
                    'impactMedium',
                    options
                );
                console.log('open settings');
                navigation.navigate({ key: 'Details' });
            }}
            icon={
                <Icon
                    name="cog"
                    size={22}
                    color={iconColor} //cycleData.style.iconColor
                />
            }
        />

    );
}

export function Example({ navigation }) {
    const {
        isOpen,
        onToggle
    } = useDisclose();
    return <Box>
        <HStack alignItems="center" >
            <IconButton variant="solid" borderRadius="full" size={21} bg="cyan.400" icon={<Icon name="bolt" color="warmGray.50" _dark={{
                color: "warmGray.50"
            }} />} />


            <IconButton
                size={21}
                onPress={onToggle}
                // onPress={() => {

                //     navigation.navigate('Schedule');
                //     ReactNativeHapticFeedback.trigger(
                //         'impactMedium',
                //         options
                //     );
                //     console.log(
                //         'open execution settings'
                //     );
                // }}
                icon={
                    <Icon
                        name="bolt"
                        size={21}
                        color={'red'}
                    />
                }
            />



            <Box alignItems="center" minW="220">
                <Stagger visible={isOpen} initial={{
                    opacity: 0,
                    scale: 0,
                    translateX: -100,
                    translateY:34,
                }} animate={{
                    translateX: 0,
                    translateY:34,
                    scale: 1,
                    opacity: 1,
                    transition: {
                        type: "spring",
                        mass: 0.8,
                        stagger: {
                            offset: 30,
                            reverse: true
                        }
                    }
                }} exit={{
                    translateX: -100,
                    translateY:34,
                    scale: 0.5,
                    opacity: 0,
                    transition: {
                        duration: 100,
                        stagger: {
                            offset: 30,
                            reverse: true
                        }
                    }
                }}>




                    <HStack space={3} alignItems="center" mb={isOpen?'22':'0'}>
                        <IconButton
                            size={21}
                            onPress={() => {

                                navigation.navigate('Schedule');
                                ReactNativeHapticFeedback.trigger(
                                    'impactMedium',
                                    options
                                );
                                console.log(
                                    'open execution settings'
                                );
                            }}
                            icon={
                                <Icon
                                    name="bolt"
                                    size={21}
                                    color={'black'}
                                />
                            }
                        />
                        <IconButton
                            size={21}
                            onPress={() => {

                                navigation.navigate('Schedule');
                                ReactNativeHapticFeedback.trigger(
                                    'impactMedium',
                                    options
                                );
                                console.log(
                                    'open execution settings'
                                );
                            }}
                            icon={
                                <Icon
                                    name="bolt"
                                    size={21}
                                    color={'red'}
                                />
                            }
                        />
                        <IconButton
                            size={21}
                            onPress={() => {

                                navigation.navigate('Schedule');
                                ReactNativeHapticFeedback.trigger(
                                    'impactMedium',
                                    options
                                );
                                console.log(
                                    'open execution settings'
                                );
                            }}
                            icon={
                                <Icon
                                    name="bolt"
                                    size={21}
                                    color={'red'}
                                />
                            }
                        />
                        <IconButton
                            size={21}
                            onPress={() => {

                                navigation.navigate('Schedule');
                                ReactNativeHapticFeedback.trigger(
                                    'impactMedium',
                                    options
                                );
                                console.log(
                                    'open execution settings'
                                );
                            }}
                            icon={
                                <Icon
                                    name="bolt"
                                    size={21}
                                    color={'red'}
                                />
                            }
                        />
                    </HStack>
                </Stagger>
            </Box>


        </HStack>
    </Box>;
};