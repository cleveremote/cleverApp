import React, { useState } from 'react';
import { Flex, IconButton, Box, View, Heading, HStack, Stagger, useDisclose } from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, navigationCycleType } from '../../data/cycleTypes';
import SensorValue from './SensorValue';


export function SensorStack({ cycleData: sensorData, navigation, orientation, closeSibillings, current}: Readonly<{ cycleData: any, navigation: navigationCycleType, orientation: OrientationType, closeSibillings: Function, current: string | undefined }>) {
    const fontColor = sensorData.style.fontColor;
    const bgColor = sensorData.style.bgColor; 
    return (
        <View>
            <Box alignSelf="stretch" bg={bgColor} rounded="xl" shadow={3} height='45' mx={1} key={sensorData.id} borderColor={sensorData.status === 'WAITTING_CONFIRMATION' ? 'red.300' : 'black'} borderWidth={sensorData.status === 'WAITTING_CONFIRMATION' ? 2 : 0}>
                <View style={{ flexDirection: 'row' }} mt={1} mx={2}>
                    <Box zIndex={99} style={{ flex: 2, alignItems: 'flex-start' }} mr={[OrientationType['LANDSCAPE-LEFT'], OrientationType['LANDSCAPE-RIGHT']].indexOf(orientation) > -1 ? 20 : 0}>
                        <Flex direction="row">
                            <MenuSensor navigation={navigation} cycleData={sensorData} closeSibillings={closeSibillings} current={current} />
                            <Heading flex={2} mt={1} ml={2} size="sm" color={fontColor} numberOfLines={1} fontSize={15} ellipsizeMode="middle">
                                {sensorData.name}
                            </Heading>
                        </Flex>
                    </Box>

                   <SensorValue cycleData={sensorData}/>
                </View>
            </Box>
        </View >
    );
}




export function MenuSensor({ navigation, cycleData, closeSibillings, current }: Readonly<{ navigation: any, cycleData: any, closeSibillings: Function, current: string | undefined }>) {
    const { isOpen, onToggle } = useDisclose();
    const iconColor = cycleData.style.iconColor.icon;
    if (current !== cycleData.name && isOpen) {
        onToggle()
    }

    return <Box mr={isOpen ? '90' : '0'} mt={0}>
        {cycleData.status !== 'WAITTING_CONFIRMATION' ? (<IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" size={30} icon={<Icon size={30} name="bars" color={iconColor} />} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);

            if (closeSibillings) {
                closeSibillings(!isOpen, cycleData.name);
            }
            onToggle();
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
                        <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" size={30} icon={<Icon name="cog" size={25} color={iconColor} />}
                            onPress={() => {
                                navigation.navigate('Settings', { screen: 'SensorSettingsMenu', params: cycleData });
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                closeSibillings(false);
                            }} />
                    </HStack>
                </Stagger>
            </Box>
        </HStack>
    </Box>;
}
