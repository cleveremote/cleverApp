import {ELEMENT_HEIGHT, ELEMENT_FONT_SIZE} from '../../styles/metrics';
import React, {useState} from 'react';
import {Pressable, Text, TouchableOpacity, View} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';

import {hapticOptions, navigationCycleType} from '../../data/cycleTypes';
import SensorValue from './SensorValue';
import {
	DeviceDisconnectedIcon,
	ExecutableConnectivityDot,
	WARNING_BORDER,
	useSensorDeviceName,
	useUnreachableDevices
} from '../device/DeviceConnectivity';
import i18n from 'i18next';
import {directionalIcon} from '../../../i18n/rtl';
import {MENU_ICON_STYLE} from '../cycle/cycleStack';

export function SensorStack({
	cycleData: sensorData,
	navigation,
	closeSibillings,
	current,
	isParent = false,
	isExpanded = true,
	onToggleExpand,
	settingsRoute = 'Settings'
}: Readonly<{
	cycleData: any;
	navigation: navigationCycleType;
	closeSibillings: Function;
	current: string | undefined;
	isParent?: boolean;
	isExpanded?: boolean;
	onToggleExpand?: () => void;
	// Route du SensorSettingsStack dans le navigateur courant.
	settingsRoute?: string;
}>) {
	const fontColor = sensorData.style.fontColor;
	const bgColor = sensorData.style.bgColor;
	const disconnected = !!useUnreachableDevices(sensorData, 'SENSOR').length;
	const waiting = sensorData.status === 'WAITTING_CONFIRMATION';
	// ANALOG : le nom est préfixé par celui du device lu.
	const deviceName = useSensorDeviceName(sensorData);
	const displayName =
		sensorData.type === 'ANALOG' && deviceName
			? `${deviceName} - ${sensorData.name}`
			: sensorData.name;
	// Déconnecté : un tap n'importe où sur la carte (hors menu) ouvre le
	// détail, à la place du dépliage d'un parent.
	const [detailsOpen, setDetailsOpen] = useState(false);
	return (
		<View>
			<Pressable
				disabled={!isParent && !disconnected}
				onPress={() => {
					if (disconnected) {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						setDetailsOpen(true);
						return;
					}
					ReactNativeHapticFeedback.trigger(
						'impactLight',
						hapticOptions
					);
					onToggleExpand?.();
				}}
				style={{
					alignSelf: 'stretch',
					backgroundColor: bgColor,
					borderRadius: 12,
					height: ELEMENT_HEIGHT,
					marginHorizontal: 4,
					marginTop: 4,
					flex: 1,
					// Une attente de confirmation prime sur le contour « déconnecté ».
					borderColor: waiting
						? '#fc8181'
						: disconnected
						? WARNING_BORDER
						: 'black',
					borderWidth: waiting || disconnected ? 2 : 0,
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
					<View
						style={{
							flex: 2,
							flexDirection: 'row',
							alignItems: 'center',
							marginLeft: 40,
							gap: 6
						}}>
						{/* Juste après l'icône menu, comme sur une carte de cycle. */}
						<DeviceDisconnectedIcon
							item={sensorData}
							kind="SENSOR"
							navigation={navigation}
							open={detailsOpen}
							onOpenChange={setDetailsOpen}
						/>
						<ExecutableConnectivityDot
							item={sensorData}
							kind="SENSOR"
						/>

						<Text
							style={{
								flexShrink: 1,
								fontWeight: 'bold',
								color: fontColor,
								fontSize: ELEMENT_FONT_SIZE
							}}
							numberOfLines={1}
							ellipsizeMode="middle">
							{displayName}
						</Text>
					</View>
					{isParent ? (
						<Icon
							size={20}
							name={isExpanded ? 'angle-down' : directionalIcon('angle-right')}
							color={fontColor}
						/>
					) : (
						<SensorValue cycleData={sensorData} />
					)}
				</View>
			</Pressable>

			<View style={{marginTop: -37, width: 60, marginLeft: 8, zIndex: 1}}>
				<MenuSensor
					navigation={navigation}
					cycleData={sensorData}
					closeSibillings={closeSibillings}
					current={current}
					settingsRoute={settingsRoute}
				/>
			</View>
		</View>
	);
}

export function MenuSensor({
	navigation,
	cycleData,
	closeSibillings,
	current,
	settingsRoute = 'Settings'
}: Readonly<{
	navigation: any;
	cycleData: any;
	closeSibillings: Function;
	current: string | undefined;
	settingsRoute?: string;
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
			label: i18n.t('cycle:menu.settings'),
			action: () => {
				ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
				closeSibillings(false);
				navigation.navigate(settingsRoute, {
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
					<Icon size={30} name="bars" color={iconColor} style={MENU_ICON_STYLE} />
				</TouchableOpacity>
			) : (
				<Icon size={30} name="user-check" color={iconColor} style={MENU_ICON_STYLE} />
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
