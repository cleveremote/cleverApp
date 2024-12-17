import React, { useEffect, useState } from 'react';
import { Flex, Switch, IconButton, Box, View, Heading, Progress, HStack, Stagger, useDisclose, Text } from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, navigationCycleType } from '../../data/cycleTypes';
import SequenceStack from './sequenceStack';
import { ModalOverrideDuration } from '../common/modalOverrideDuration';
import { Alert } from 'react-native';
import { connect } from 'react-redux';
import SensorStatus from './CycleStatus';
import SeqeuncesList from './SequencesList';


export function CycleStack({ cycleData, navigation, orientation, closeSibillings, current, onSwitch, onSkip, onExecute, status }: Readonly<{ cycleData: any, navigation: any, orientation: OrientationType, closeSibillings: Function, current: string | undefined, onSwitch: (value: boolean, type: string) => void | Promise<void>, onSkip: (sequenceId: any) => void, onExecute: (seqeunceId: string, ms: number) => void, status?: any }>) {
    const fontColor = cycleData.style.fontColor;
    const iconColorSwitch = cycleData.style.iconColor.base?.split('.')[0];
    const bgColor = cycleData.style.bgColor; //cycleData.status === 'WAITTING_CONFIRMATION' ? "white" :

    return (
        <View>
            <Box alignSelf="stretch" bg={bgColor} rounded="xl" shadow={3} height='45' mx={1} key={cycleData.id} >
                <View style={{ flexDirection: 'row' }} mt={1} mx={2}>
                    <Box zIndex={99} style={{ flex: 2, alignItems: 'flex-start' }} mr={[OrientationType['LANDSCAPE-LEFT'], OrientationType['LANDSCAPE-RIGHT']].indexOf(orientation) > -1 ? 20 : 0}>
                        <Flex direction="row">
                            <MenuCycle navigation={navigation} cycleData={cycleData} closeSibillings={closeSibillings} current={current} onExecute={onExecute} status={status.find((x: any) => x?.id === cycleData.id)?.status} />
                            <Heading flex={2} mt={1} ml={4} size="sm" color={fontColor} numberOfLines={1} fontSize={15} ellipsizeMode="middle">
                                {cycleData.name}
                            </Heading>
                        </Flex>
                    </Box>
                    <SensorStatus cycleData={cycleData} iconColorSwitch={iconColorSwitch} onSwitch={onSwitch} onSkip={onSkip} navigation={navigation} />
                </View>
            </Box>
            <SeqeuncesList cycleData={cycleData} onSkip={onSkip} navigation={navigation} />
        </View >

    );
}




export function MenuCycle({ navigation, cycleData, closeSibillings, current, onExecute, status }: Readonly<{ navigation: any, cycleData: any, closeSibillings: Function, current: string | undefined, onExecute: (seqeunceId: string, ms: number) => void, status: any }>) {
    const { isOpen, onToggle } = useDisclose();
    const iconColor = cycleData.style.iconColor.icon;
    if (current !== cycleData.name && isOpen) {
        onToggle()
    }
    const [isOpened, setIsOpened] = useState(false);
    const onPress = () => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        setIsOpened(!isOpened)
    };

    return <Box mr={isOpen ? '90' : '0'} mt={0}>
        {status !== 'WAITTING_CONFIRMATION' ? (<IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon size={30} name="bars" color={iconColor} />} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);

            if (status !== 'IN_PROCCESS') {
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
                    <HStack space={2} alignItems="center" ml={isOpen ? '35' : '0'} >
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
                        <IconButton _pressed={{ _icon: { size: 30 } }} variant="unstyled" size={30} icon={<Icon name="tasks" size={25} color={iconColor} />}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                closeSibillings(false);
                                navigation.navigate('EventsScreen', { cycle: cycleData });
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

const mapStateToProps = (state: any) => ({
    status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(CycleStack);
