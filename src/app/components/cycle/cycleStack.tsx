import React, {useState} from 'react';
import {Alert, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {OrientationType} from 'react-native-orientation-locker';
import {hapticOptions, navigationCycleType} from '../../data/cycleTypes';
import SequenceStack from './sequenceStack';
import {ModalOverrideDuration} from '../common/modalOverrideDuration';
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
	const iconColorSwitch = cycleData.style.iconColor.base;
	const bgColor = cycleData.style.bgColor;

	return (
		<View>
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: bgColor,
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22,
					height: 45,
					marginHorizontal: 4,
					marginTop: 4,
					flex: 1
				}}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						flex: 1,
						marginHorizontal: 8
					}}>
					<View style={{flex: 2}}>
						<Text
							style={{
								fontWeight: 'bold',
								color: fontColor,
								fontSize: 15,
								marginLeft: 40
							}}
							numberOfLines={1}
							ellipsizeMode="middle">
							{cycleData.name}
						</Text>
					</View>
					<SensorStatus
						cycleData={cycleData}
						iconColorSwitch={iconColorSwitch}
						onSwitch={onSwitch}
						closeSibillings={closeSibillings}
						onSkip={onSkip}
						navigation={navigation}
					/>
				</View>
			</View>

			<View style={{marginTop: -37, width: 60, marginLeft: 8}}>
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
			</View>
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

	const menuItems = [
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
			name: 'history',
			label: 'Schedules',
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
		<View>
			{status !== 'WAITTING_CONFIRMATION' ? (
				<TouchableOpacity
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
					}}>
					<Icon size={30} name="bars" color={iconColor} />
				</TouchableOpacity>
			) : (
				<Icon size={30} name="user-check" color={iconColor} />
			)}
			{isOpen && (
				<View>
					{menuItems.map((item, index) => (
						<Animated.View
							key={index}
							entering={FadeInDown.delay(index * 25)
								.springify()
								.damping(10)
								.mass(0.8)}>
							<View
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									width: 100
								}}>
								<TouchableOpacity
									style={{
										marginTop: 16,
										flexDirection: 'row',
										alignItems: 'center',
										gap: 8
									}}
									onPress={item.action}
									onLongPress={item.onLongPress}>
									<Icon
										name={item.name}
										size={25}
										color={'#32404e'}
									/>
									<Text
										style={{
											fontWeight: 'bold',
											color: '#32404e',
											fontSize: 14
										}}>
										{item.label.charAt(0).toUpperCase() +
											item.label.slice(1)}
									</Text>
								</TouchableOpacity>
							</View>
						</Animated.View>
					))}
				</View>
			)}

			<ModalOverrideDuration
				isOpen={isOpened}
				onClose={onPress}
				onConfirm={(ms: number) => {
					onExecute(cycleData.id, ms);
					onPress();
				}}
			/>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(CycleStack);
