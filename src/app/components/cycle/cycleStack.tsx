import React, {useEffect, useState} from 'react';
import {Flex, IconButton, Box, View, Heading, HStack, Text} from 'native-base';
import Animated, {FadeInDown, FadeOutUp} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {OrientationType} from 'react-native-orientation-locker';
import {hapticOptions, navigationCycleType} from '../../data/cycleTypes';
import SequenceStack from './sequenceStack';
import {ModalOverrideDuration} from '../common/modalOverrideDuration';
import {Alert} from 'react-native';
import {connect} from 'react-redux';
import SensorStatus from './CycleStatus';
import SeqeuncesList from './SequencesList';

export function CycleStack({
	cycleData,
	navigation,
	orientation,
	closeSibillings,
	current,
	onSwitch,
	onSkip,
	onExecute,
	status
}: Readonly<{
	cycleData: any;
	navigation: any;
	orientation: OrientationType;
	closeSibillings: Function;
	current: string | undefined;
	onSwitch: (value: boolean, type: string) => void | Promise<void>;
	onSkip: (sequenceId: any) => void;
	onExecute: (seqeunceId: string, ms: number) => void;
	status?: any;
}>) {
	const fontColor = cycleData.style.fontColor;
	const iconColorSwitch = cycleData.style.iconColor.base?.split('.')[0];
	const bgColor = cycleData.style.bgColor; //cycleData.status === 'WAITTING_CONFIRMATION' ? "white" :

	return (
		<View>
			<Box
				alignSelf="stretch"
				bg={bgColor}
				rounded="xl"
				shadow={3}
				height={45}
				mx={1}
				key={cycleData.id}
				mt={1}>
				<Flex
					direction="row"
					alignItems="center" // centre verticalement
					justifyContent="space-between" // espace entre Heading et SensorStatus
					flex={1}
					mx={2}>
					<Box flex={2}>
						<Heading
							size="sm"
							color={fontColor}
							numberOfLines={1}
							fontSize={15}
							ellipsizeMode="middle"
							ml={10}>
							{cycleData.name}
						</Heading>
					</Box>
					<SensorStatus
						cycleData={cycleData}
						iconColorSwitch={iconColorSwitch}
						onSwitch={onSwitch}
						closeSibillings={closeSibillings}
						onSkip={onSkip}
						navigation={navigation}
					/>
				</Flex>
			</Box>

			<Box mt={'-37px'} width={'60px'} ml={'2'}>
				<MenuCycle
					navigation={navigation}
					cycleData={cycleData}
					closeSibillings={closeSibillings}
					current={current}
					onExecute={onExecute}
					status={
						status.find((x: any) => x?.id === cycleData.id)?.status
					}
				/>
			</Box>
			<SeqeuncesList
				cycleData={cycleData}
				onSkip={onSkip}
				navigation={navigation}
			/>
		</View>
	);
}

export function MenuCycle({
	navigation,
	cycleData,
	closeSibillings,
	current,
	onExecute,
	status
}: Readonly<{
	navigation: any;
	cycleData: any;
	closeSibillings: Function;
	current: string | undefined;
	onExecute: (sequenceId: string, ms: number) => void;
	status: any;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const onToggle = () => setIsOpen(prev => !prev);
	const [isOpened, setIsOpened] = useState(false);
	const iconColor = cycleData.style.iconColor.icon;

	if (current !== cycleData.name && isOpen) {
		onToggle();
	}

	const onPress = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setIsOpened(!isOpened);
	};

	// ✅ Définition des items du menu
	const menuItems = [
		{
			name: 'history',
			label: 'Schedules1',
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				navigation.navigate('SchedulesStack', {
					screen: 'Schedules',
					params: {cycle: cycleData}
				});
				onToggle();
			},
			onLongPress: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				onToggle();
				onPress();
				closeSibillings(false);
			}
		},
		{
			name: 'cog',
			label: 'Settings',
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				closeSibillings(false);
				navigation.navigate('Settings', {
					screen: 'CycleSettingsMenu',
					params: cycleData
				});
			}
		},
		{
			name: 'bullseye',
			label: 'Triggers',
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				closeSibillings(false);
				navigation.navigate('TriggersStack', {
					screen: 'Triggers',
					params: {cycle: cycleData}
				});
			}
		},
		{
			name: 'tasks',
			label: 'Events',
			action: () => {
				ReactNativeHapticFeedback.trigger(
					'impactMedium',
					hapticOptions
				);
				closeSibillings(false);
				navigation.navigate('EventsScreen', {cycle: cycleData});
			}
		}
	];

	return (
		<Box>
			{/* Bouton principal */}
			{status !== 'WAITTING_CONFIRMATION' ? (
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
						if (status !== 'IN_PROCCESS') {
							if (closeSibillings) {
								closeSibillings(!isOpen, cycleData.name);
							}
							onToggle();
						} else {
							Alert.alert(
								'Cycle in process!\nTo access settings please stop the process'
							);
						}
					}}
				/>
			) : (
				<Icon size={30} name="user-check" color={iconColor} />
			)}
			{/* Menu animé */}
			{isOpen && (
				<Box>
					{menuItems.map((item, index) => (
						<Animated.View
							key={index}
							entering={FadeInDown.delay(index * 25)
								.springify()
								.damping(10)
								.mass(0.8)}
							exiting={FadeOutUp.delay(
								(menuItems.length - 1 - index) * 60
							).duration(120)}>
							<HStack alignItems="center" space={2} width={100}>
								<IconButton
									mt="4"
									_pressed={{_icon: {size: 30}}}
									variant="unstyled"
									size={30}
									icon={
										<Icon
											name={item.name}
											size={25}
											color={'#32404e'}
										/>
									}
									onPress={item.action}
									onLongPress={item.onLongPress}
								/>
								<Text bold color="#32404e" fontSize={14} mt="4">
									{item.label.charAt(0).toUpperCase() +
										item.label.slice(1)}
								</Text>
							</HStack>
						</Animated.View>
					))}
				</Box>
			)}

			{/* Modal d'exécution */}
			<ModalOverrideDuration
				isOpen={isOpened}
				onClose={onPress}
				onConfirm={(ms: number) => {
					onExecute(cycleData.id, ms);
					onPress();
				}}
			/>
		</Box>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(CycleStack);
