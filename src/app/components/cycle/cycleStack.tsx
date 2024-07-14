import React, { useEffect, useState } from 'react';
import { Flex, Switch, IconButton, Box, View, Heading, Progress, HStack, Stagger, useDisclose, Text } from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, navigationCycleType } from '../../data/cycleTypes';
import { SequenceStack } from './sequenceStack';
import { ModalOverrideDuration } from '../common/modalOverrideDuration';
import { Alert } from 'react-native';


export function CycleStack({ cycleData, navigation, orientation, closeSibillings, current, onSwitch, onSkip, onExecute }: Readonly<{ cycleData: any, navigation: any, orientation: OrientationType, closeSibillings: Function, current: string | undefined, onSwitch: (value: boolean, type: string) => void | Promise<void>, onSkip: (sequenceId: any) => void, onExecute: (seqeunceId: string, ms: number) => void }>) {
    const fontColor = cycleData.style.fontColor;
    const iconColorSwitch = cycleData.style.iconColor.base?.split('.')[0];
    const bgColor = cycleData.status === 'WAITTING_CONFIRMATION' ? "white" : cycleData.style.bgColor;
    const [status, setStatus] = useState(cycleData.status);
    useEffect(() => {
        setStatus(cycleData.status);
    }, [cycleData.status])
    return (
        <View>
            <Box alignSelf="stretch" bg={bgColor} rounded="xl" shadow={3} height='45' mx={1} key={cycleData.id} borderColor={cycleData.status === 'WAITTING_CONFIRMATION' ? 'red.300' : 'black'} borderWidth={cycleData.status === 'WAITTING_CONFIRMATION' ? 2 : 0}>
                <View style={{ flexDirection: 'row' }} mt={1} mx={2}>
                    <Box zIndex={99} style={{ flex: 2, alignItems: 'flex-start' }} mr={[OrientationType['LANDSCAPE-LEFT'], OrientationType['LANDSCAPE-RIGHT']].indexOf(orientation) > -1 ? 20 : 0}>
                        <Flex direction="row">
                            <MenuCycle navigation={navigation} cycleData={cycleData} closeSibillings={closeSibillings} current={current} onExecute={onExecute} />
                            <Heading flex={2} mt={1} ml={2} size="sm" color={fontColor} numberOfLines={1} fontSize={15} ellipsizeMode="middle">
                                {cycleData.name}
                            </Heading>
                        </Flex>
                    </Box>

                    <Box style={{ alignItems: 'flex-end' }} >
                        {cycleData.status === 'WAITTING_CONFIRMATION' ? (<HStack space={3} alignItems="center" ml={'0'} >
                            <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon name="check-circle" size={25} color='green' />}
                                onLongPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    onSwitch(true, 'FORCE');
                                }}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    console.log('open execution settings');
                                }} />
                            <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon name="times-circle" size={25} color='red' />}
                                onLongPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    onSwitch(false, 'IGNORE');
                                }} />
                            <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon name="arrow-alt-circle-right" size={25} color='orange' />}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    console.log('open execution settings');
                                }} />
                        </HStack>) : <Switch mt={0.5} isChecked={status === 'IN_PROCCESS'} onTrackColor={iconColorSwitch + ".400"} offThumbColor={iconColorSwitch + ".50"} size={'md'} onValueChange={(value) => { onSwitch(value, 'INIT'); setStatus(value ? 'IN_PROCCESS' : 'STOPPED'); }} />}
                    </Box>
                </View>
            </Box>
            {
                cycleData.status === 'IN_PROCCESS' ?
                    cycleData.sequences.map((sequence: any, index: number) => <Box key={'sequence_' + index} marginLeft={5} marginTop={2}>
                        <SequenceStack navigation={navigation} cycleId={cycleData.id} item={sequence} isActive={false} onSkip={() => onSkip(sequence.id)} stackParent={true} />
                    </Box>) : null
            }
        </View >

    );
}




export function MenuCycle({ navigation, cycleData, closeSibillings, current, onExecute }: Readonly<{ navigation: any, cycleData: any, closeSibillings: Function, current: string | undefined, onExecute: (seqeunceId: string, ms: number) => void }>) {
    const { isOpen, onToggle } = useDisclose();
    const iconColor = cycleData.style.iconColor.icon;
    if (current !== cycleData.name && isOpen) {
        onToggle()
    }
    const [isOpened, setOpened] = useState(false);
    const onPress = () => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        setOpened(!isOpened)
    };

    return <Box mr={isOpen ? '90' : '0'} mt={0}>
        {cycleData.status !== 'WAITTING_CONFIRMATION' ? (<IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon size={30} name="bars" color={iconColor} />} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);

            if (cycleData.status !== 'IN_PROCCESS') {
                if (closeSibillings) {
                    closeSibillings(!isOpen, cycleData.name);
                }
                onToggle();
            } else {
                Alert.alert("Cycle in process!\n to access settings please stop the process")
            }


        }} />) : <Icon size={30} name="user-check" color={iconColor} />}
        <HStack alignItems="center" >
            <Box alignItems="stretch" width={isOpen ? '90' : '0'} >
                <Stagger visible={isOpen}
                    initial={{ opacity: 0, scale: 0, translateX: -30, translateY: -31, }}
                    animate={{
                        translateX: 0, translateY: -31, scale: 1, opacity: 1,
                        transition: { type: "spring", mass: 0.8, stagger: { offset: 50, reverse: true } }
                    }} exit={{
                        translateX: -30, translateY: -31, scale: 0.5, opacity: 0,
                        transition: { duration: 0, stagger: { offset: 30, reverse: true } }
                    }}>
                    <HStack space={3} alignItems="center" ml={isOpen ? '35' : '0'} >
                        <IconButton _pressed={{ _icon: { size: 30 } }} variant="unstyled" size={30} icon={<Icon name="history" size={25} color={iconColor} />}
                            onLongPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                onToggle();
                                onPress();
                                closeSibillings(false);
                            }}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                navigation.navigate('SchedulesStack', { screen: 'Schedules', params: { cycle: cycleData } });
                                onToggle();
                            }} />
                        <IconButton _pressed={{ _icon: { size: 30 } }} variant="unstyled" size={30} icon={<Icon name="cog" size={25} color={iconColor} />}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                closeSibillings(false);
                                navigation.navigate('Settings', { screen: 'CycleSettingsMenu', params: cycleData });
                            }} />
                        <IconButton _pressed={{ _icon: { size: 30 } }} variant="unstyled" size={30} icon={<Icon name="bullseye" size={25} color={iconColor} />}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                closeSibillings(false);
                                navigation.navigate('TriggersStack', { screen: 'Triggers', params: { cycle: cycleData } });
                            }} />
                    </HStack>
                </Stagger>
            </Box>
        </HStack>
        <ModalOverrideDuration isOpen={isOpened}
            onClose={() => {
                onPress();
            }}
            onConfirm={(ms: number) => {
                onExecute(cycleData.id, ms);
                onPress();
            }} />
    </Box>;
}
