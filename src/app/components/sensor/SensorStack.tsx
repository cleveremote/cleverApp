import React, {useEffect, useState} from 'react';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming
} from 'react-native-reanimated';
import {Flex, IconButton, Box, View, Heading, HStack} from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {OrientationType} from 'react-native-orientation-locker';
import {hapticOptions, navigationCycleType} from '../../data/cycleTypes';
import SensorValue from './SensorValue';

export function SensorStack({
	cycleData: sensorData,
	navigation,
	orientation,
	closeSibillings,
	current
}: Readonly<{
	cycleData: any;
	navigation: navigationCycleType;
	orientation: OrientationType;
	closeSibillings: Function;
	current: string | undefined;
}>) {
	const fontColor = sensorData.style.fontColor;
	const bgColor = sensorData.style.bgColor;
	return (
		<View>
			<Box
				alignSelf="stretch"
				bg={bgColor}
				rounded="xl"
				shadow={3}
				height="45"
				mx={1}
				key={sensorData.id}
				borderColor={
					sensorData.status === 'WAITTING_CONFIRMATION'
						? 'red.300'
						: 'black'
				}
				borderWidth={
					sensorData.status === 'WAITTING_CONFIRMATION' ? 2 : 0
				}>
				<View style={{flexDirection: 'row'}} mt={1} mx={2}>
					<Box
						zIndex={99}
						style={{flex: 2, alignItems: 'flex-start'}}
						mr={
							[
								OrientationType['LANDSCAPE-LEFT'],
								OrientationType['LANDSCAPE-RIGHT']
							].indexOf(orientation) > -1
								? 20
								: 0
						}>
						<Flex direction="row">
							<MenuSensor
								navigation={navigation}
								cycleData={sensorData}
								closeSibillings={closeSibillings}
								current={current}
							/>
							<Heading
								flex={2}
								mt={1}
								ml={2}
								size="sm"
								color={fontColor}
								numberOfLines={1}
								fontSize={15}
								ellipsizeMode="middle">
								{sensorData.name}
							</Heading>
						</Flex>
					</Box>

					<SensorValue cycleData={sensorData} />
				</View>
			</Box>
		</View>
	);
}

export function MenuSensor({
	navigation,
	cycleData,
	closeSibillings,
	current
}: Readonly<{
	navigation: any;
	cycleData: any;
	closeSibillings: Function;
	current: string | undefined;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const onToggle = () => setIsOpen(prev => !prev);

	const iconColor = cycleData.style.iconColor.icon;
	if (current !== cycleData.name && isOpen) {
		onToggle();
	}

	const opacity = useSharedValue(0);
	const translateX = useSharedValue(-30);
	const scale = useSharedValue(0);

	useEffect(() => {
		if (isOpen) {
			opacity.value = withSpring(1, {mass: 0.8});
			translateX.value = withSpring(0, {mass: 0.8});
			scale.value = withSpring(1, {mass: 0.8});
		} else {
			opacity.value = withTiming(0, {duration: 0});
			translateX.value = withTiming(-30, {duration: 0});
			scale.value = withTiming(0.5, {duration: 0});
		}
	}, [isOpen]);

	const animStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [
			{translateX: translateX.value},
			{translateY: -31},
			{scale: scale.value}
		]
	}));

	return (
		<Box mr={isOpen ? '90' : '0'} mt={0}>
			{cycleData.status !== 'WAITTING_CONFIRMATION' ? (
				<IconButton
					_pressed={{_icon: {size: 35}}}
					variant="unstyled"
					size={30}
					icon={<Icon size={30} name="bars" color={iconColor} />}
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);

						if (closeSibillings) {
							closeSibillings(!isOpen, cycleData.name);
						}
						onToggle();
					}}
				/>
			) : (
				<Icon size={30} name="user-check" color={iconColor} />
			)}
			<HStack alignItems="center">
				<Box alignItems="stretch" width={isOpen ? '90' : '0'}>
					<Animated.View style={animStyle}>
						<HStack
							space={3}
							alignItems="center"
							ml={isOpen ? '35' : '0'}>
							<IconButton
								_pressed={{_icon: {size: 35}}}
								variant="unstyled"
								size={30}
								icon={
									<Icon
										name="cog"
										size={25}
										color={iconColor}
									/>
								}
								onPress={() => {
									navigation.navigate('Settings', {
										screen: 'SensorSettingsMenu',
										params: cycleData
									});
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									closeSibillings(false);
								}}
							/>
						</HStack>
					</Animated.View>
				</Box>
			</HStack>
		</Box>
	);
}
