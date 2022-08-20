import React, { useEffect, useState } from 'react';
import { Flex, Switch, IconButton, Box, View, Heading, Progress, HStack, Stagger, useDisclose, Text } from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, ICyclesProps, navigationCycleType } from '../../data/cycleTypes';
import { useSelector, useDispatch, connect } from 'react-redux'
import { closeMenus } from '../../../module/process/infrasctructure/store/actions/processActions';
import { SwitchChangeEvent } from 'react-native';


export function CycleStack({ cycleData, navigation, orientation, closeSibillings, current, onSwitch }: { cycleData: any, navigation: navigationCycleType, orientation: OrientationType, closeSibillings: Function, current: string | undefined, onSwitch: (value: boolean) => void | Promise<void> }) {
    const fontColor = cycleData.style.fontColor;
    const iconColor = cycleData.style.iconColor.base?.split('.')[0];
    const bgColor = cycleData.style.bgColor;
    const [progression, setProgression] = useState(0);


    useEffect(() => {
        let interval;
        if (cycleData.status !== 'STOPPED') {
            const now = new Date();
            const startdate = new Date(cycleData.progression.startedAt);
            function difference(date1: Date, date2: Date) {
                const date1utc = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate(), date1.getHours(), date1.getMinutes(), date1.getSeconds());
                const date2utc = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate(), date2.getHours(), date2.getMinutes(), date2.getSeconds());
                //day = 1000 * 60 * 60 * 24;
                return (date1utc - date2utc) /// day
            }
            const startIndex = (difference(now, startdate) * 100) / (cycleData.progression.duration);
            setProgression(startIndex);
             interval = setInterval(() => {
                setProgression(progression => progression + ((100 - startIndex) / (cycleData.progression.duration / 1000)));
            }, 1000);

            setTimeout(() => {
                clearInterval(interval);
                setProgression(0);
            }, cycleData.progression.duration);
        } else{
            clearInterval(interval);
            setProgression(0);
        }

    }, [cycleData]);





    return (
        <Box alignSelf="stretch" bg={bgColor} rounded="xl" shadow={3} height='45' mx={1} key={cycleData.id}>
            <View style={{ flexDirection: 'row' }} mt={1} mx={2}>
                <Box zIndex={99} style={{ flex: 2, alignItems: 'flex-start' }} mr={[OrientationType['LANDSCAPE-LEFT'], OrientationType['LANDSCAPE-RIGHT']].indexOf(orientation) > -1 ? 20 : 0}>
                    <Flex direction="row">
                        <MenuCycle navigation={navigation} cycleData={cycleData} closeSibillings={closeSibillings} current={current} />
                        <Heading flex={2} mt={2} ml={2} size="sm" color={fontColor} numberOfLines={1} fontSize={15} ellipsizeMode="middle">
                            {cycleData.name}
                        </Heading>
                        <Flex direction="row" mt={2} display={[OrientationType['LANDSCAPE-LEFT'], OrientationType['LANDSCAPE-RIGHT']].indexOf(orientation) > -1 ? 'flex' : 'none'} style={{ flex: 2 }}>
                            <Progress alignSelf="stretch" width={'100%'} size="xl" rounded="md" value={progression} _filledTrack={{ bg: iconColor + ".400" }} />
                            <Text color={'grey'} ml={2} >{Math.round(progression)}</Text>
                        </Flex>
                    </Flex>
                </Box>

                <Box style={{ alignItems: 'flex-end' }} >
                    <Switch mt={0.5} isChecked={cycleData.status === 'IN_PROCCESS'} onTrackColor={iconColor + ".400"} offThumbColor={iconColor + ".50"} size={'md'} onValueChange={onSwitch} />
                </Box>
            </View>
        </Box>
    );
}




export function MenuCycle({ navigation, cycleData, closeSibillings, current }: { navigation: navigationCycleType, cycleData: any, closeSibillings: Function, current: string | undefined }) {
    const { isOpen, onToggle } = useDisclose();
    const iconColor = cycleData.style.iconColor.icon;
    if (current !== cycleData.name && isOpen) {
        onToggle()
    }

    return <Box mr={isOpen ? '90' : '0'} mt={1}>
        <IconButton size={30} icon={<Icon size={30} name="bars" color={iconColor} />} onPress={() => {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);

            if (closeSibillings) {
                closeSibillings(!isOpen, cycleData.name);
            }
            onToggle();
        }}

        />
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
                        <IconButton size={30} icon={<Icon name="history" size={25} color={iconColor} />}
                            onPress={() => {
                                navigation.navigate('Schedule');
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                //console.log('open execution settings');
                                onToggle();
                            }} />
                        <IconButton size={30} icon={<Icon name="cog" size={25} color={iconColor} />}
                            onPress={() => {
                                navigation.navigate('Settings', cycleData);
                                // ReactNativeHapticFeedback.trigger('impactMedium',hapticOptions);
                                // //console.log('open execution settings');
                            }} />
                        <IconButton size={30} icon={<Icon name="laptop-code" size={25} color={iconColor} />}
                            onPress={() => {
                                navigation.navigate('Settings');
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                //console.log('open execution settings');
                            }} />
                    </HStack>
                </Stagger>
            </Box>
        </HStack>
    </Box>;
}
