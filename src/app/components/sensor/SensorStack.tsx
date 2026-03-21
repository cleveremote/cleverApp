import React, {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';

import {hapticOptions, navigationCycleType} from '../../data/cycleTypes';
import SensorValue from './SensorValue';

export function SensorStack({
	cycleData: sensorData,
	navigation,
	closeSibillings,
	current
}: Readonly<{
	cycleData: any;
	navigation: navigationCycleType;
	closeSibillings: Function;
	current: string | undefined;
}>) {
	const fontColor = sensorData.style.fontColor;
	const bgColor = sensorData.style.bgColor;
	return (
		<View>
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: bgColor,
					borderRadius: 12,
					height: 45,
					marginHorizontal: 4,
					marginTop: 4,
					flex: 1,
					borderColor:
						sensorData.status === 'WAITTING_CONFIRMATION'
							? '#fc8181'
							: 'black',
					borderWidth:
						sensorData.status === 'WAITTING_CONFIRMATION' ? 2 : 0,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22
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
							{sensorData.name}
						</Text>
					</View>
					<SensorValue cycleData={sensorData} />
				</View>
			</View>

			<View style={{marginTop: -37, width: 60, marginLeft: 8, zIndex: 1}}>
				<MenuSensor
					navigation={navigation}
					cycleData={sensorData}
					closeSibillings={closeSibillings}
					current={current}
				/>
			</View>
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

	const menuItems = [
		{
			name: 'cog',
			label: 'Settings',
			action: () => {
				ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
				closeSibillings(false);
				navigation.navigate('Settings', {
					screen: 'SensorSettingsMenu',
					params: cycleData
				});
			}
		}
	];

	return (
		<View>
			{cycleData.status !== 'WAITTING_CONFIRMATION' ? (
				<TouchableOpacity
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						if (closeSibillings) {
							closeSibillings(!isOpen, cycleData.name);
						}
						onToggle();
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
									onPress={item.action}>
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
		</View>
	);
}
