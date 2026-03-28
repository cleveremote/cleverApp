import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import React, {useCallback, useEffect} from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {BLEService} from '../../../module/ble/BLEService';
import {hapticOptions} from '../../data/cycleTypes';
import {Device} from 'react-native-ble-plx';

export function DeviceScreen(props: any) {
	const [devices, setDevices] = React.useState<Device[]>([]);

	const nav = useNavigation();
	useEffect(() => {
		nav.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
	}, []);

	useFocusEffect(
		useCallback(() => {
			const devices = async () => {
				const devices = await BLEService.ScanBleDevices();
				setDevices(devices);
			};
			devices();
		}, [])
	);

	return (
		<View style={{flex: 1, marginTop: 25}}>
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center'
				}}>
				<Text
					style={{
						color: '#32404e',
						fontSize: 15,
						fontWeight: 'bold'
					}}>
					Select the device to configure :
				</Text>
			</View>

			<View
				style={{
					flex: 2,
					justifyContent: 'center',
					alignItems: 'center'
				}}>
				<ScrollView
					showsVerticalScrollIndicator={false}
					showsHorizontalScrollIndicator={false}>
					{devices.length ? (
						devices.map((device, index) => (
							<View
								key={'item_' + index}
								style={{
									marginTop: 8,
									justifyContent: 'center',
									alignItems: 'center'
								}}>
								<View
									style={{
										width: 47,
										height: 47,
										borderRadius: 0.5 * 47,
										justifyContent: 'center',
										alignItems: 'center',
										borderColor: '#0082FC',
										borderWidth: 4
									}}>
									<TouchableOpacity
										onPress={async () => {
											ReactNativeHapticFeedback.trigger(
												'impactMedium',
												hapticOptions
											);
											props.navigation.navigate(
												'deviceSettings',
												{
													deviceId: device.id,
													deviceName: device.localName
												}
											);
										}}>
										<Icon
											name="bluetooth-b"
											size={18}
											color="#0082FC"
										/>
									</TouchableOpacity>
								</View>
								<Text
									style={{
										color: '#0082FC',
										fontSize: 15,
										margin: 5,
										fontWeight: 'bold'
									}}>
									device: {device.localName}
								</Text>
							</View>
						))
					) : (
						<Text
							style={{
								color: '#32404e',
								fontSize: 15,
								marginLeft: 5
							}}>
							Scan in progress ...
						</Text>
					)}
				</ScrollView>
			</View>

			<View
				style={{
					marginLeft: 40,
					marginRight: 40,
					marginBottom: 20,
					alignSelf: 'center',
					alignItems: 'center'
				}}>
				<TouchableOpacity
					onPress={async () => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						setDevices([]);
						const devices = await BLEService.ScanBleDevices();
						setDevices(devices);
					}}>
					<Icon name="search" size={30} color="#32404e" />
				</TouchableOpacity>
				<Text style={{color: '#32404e', fontSize: 15}}>
					Scan network
				</Text>
			</View>
		</View>
	);
}
