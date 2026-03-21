import React, {useEffect} from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	Alert,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../data/cycleTypes';
import {Picker} from '@react-native-picker/picker';
import Spinner from 'react-native-loading-spinner-overlay';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useNavigation} from '@react-navigation/native';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {BLEService} from '../../../module/ble/BLEService';
import {saveSigninData} from '../../components/common/RememberMeManager';
import {decode} from 'base-64';

export function DeviceSettings(props: any) {
	const [psk, setPsk] = React.useState('');
	const [ssid, setSsid] = React.useState('1');
	const [password, setPassword] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);
	const [profile, setProfile] = React.useState('New profile');
	const [networks, setNetworks] = React.useState([]);

	const nav = useNavigation();
	useEffect(() => {
		nav.setOptions({
			headerRight: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				),
			headerLeft: brandLogo
		});
		setIsLoading(true);
		BLEService.connectToDevice(props.route.params?.deviceId)
			.then(() =>
				BLEService.discoverAllServicesAndCharacteristicsForDevice()
			)
			.then(device => {
				return BLEService.readCharacteristicForDevice(
					'22222222-3333-4444-5555-666666666666',
					'22222222-3333-4444-5555-666666666668'
				);
			})
			.then(result => {
				if (result.value) {
					console.log(
						'Networks raw value:',
						JSON.parse(decode(result.value))
					);
					setNetworks(
						JSON.parse(decode(result.value)).map((x: any) => ({
							label: `${x.name} (${
								x.isConfigured && x['in-use']
									? 'configured'
									: ''
							}) `,
							value: x.name
						}))
					);
				}
				setIsLoading(false);
				return BLEService.disconnectDeviceById(
					props.route.params?.deviceId
				);
			})
			.catch(error => {
				Alert.alert(error.message);
				setIsLoading(false);
			});
	}, []);

	const onLogin = async (deviceId: string) => {
		setIsLoading(true);
		const Buffer = require('buffer').Buffer;
		const data = {ssid: ssid, psk: psk, password: password};
		const dataStr = JSON.stringify(data);
		const encodedAuth = new Buffer(dataStr).toString('base64');

		await BLEService.connectToDevice(deviceId)
			.then(async () => {
				await BLEService.discoverAllServicesAndCharacteristicsForDevice();
			})
			.then(async device => {
				await BLEService.writeCharacteristicWithResponseForDevice(
					'22222222-3333-4444-5555-666666666666',
					'22222222-3333-4444-5555-666666666669',
					encodedAuth
				);
				await saveSigninData(
					profile,
					props.route.params?.deviceName,
					password,
					true,
					''
				);
				props.navigation.navigate('Signin', {profile});
				setIsLoading(false);
			})
			.catch(error => {
				console.error('Error caught:', error);
				setIsLoading(false);
				Alert.alert('Permission denied: check your password.');
			})
			.then(async () => {
				await BLEService.disconnectDeviceById(deviceId);
			});
	};

	return (
		<View style={{flex: 1, marginTop: 50}}>
			<View style={{alignItems: 'center'}}>
				<View
					style={{
						width: 70,
						height: 70,
						borderRadius: 0.5 * 70,
						justifyContent: 'center',
						alignItems: 'center',
						borderColor: '#32404e',
						borderWidth: 7
					}}>
					<Icon name="wifi" size={30} color="#32404e" />
				</View>
			</View>
			<View
				style={{
					gap: 8,
					marginVertical: 4,
					alignSelf: 'stretch',
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22
				}}>
				<View
					style={{
						alignSelf: 'stretch',
						backgroundColor: 'white',
						marginTop: 8,
						marginHorizontal: 20,
						borderRadius: 12,
						padding: 20
					}}>
					<View style={{gap: 8, alignItems: 'center'}}>
						<Spinner
							visible={isLoading}
							color="#32404e"
							textStyle={styles.spinnerTextStyle}
						/>
						<TextInput
							style={[
								styles.input,
								{width: '100%'}
							]}
							placeholder="Profile"
							value={profile}
							onChangeText={value => {
								setProfile(value);
							}}
						/>
						<Picker
							selectedValue={ssid}
							style={{width: '100%', height: 50}}
							onValueChange={value => {
								setSsid(value);
							}}>
							{networks.map((item: any, index: number) => (
								<Picker.Item
									key={'action_' + index}
									label={`${item.label}`}
									value={`${item.value}`}
								/>
							))}
						</Picker>
						<TextInput
							style={[styles.input, {width: '100%'}]}
							placeholder="Psk"
							secureTextEntry={true}
							textContentType={'newPassword'}
							value={psk}
							onChangeText={value => {
								setPsk(value);
							}}
						/>
						<TextInput
							style={[styles.input, {width: '100%'}]}
							placeholder="Password"
							secureTextEntry={true}
							textContentType={'newPassword'}
							value={password}
							onChangeText={value => {
								setPassword(value);
							}}
						/>
						<TouchableOpacity
							style={{
								alignSelf: 'stretch',
								height: 50,
								backgroundColor:
									!(ssid && psk && password)
										? '#a5a4a5'
										: '#32404e',
								justifyContent: 'center',
								alignItems: 'center',
								borderRadius: 6
							}}
							disabled={!(ssid && psk && password)}
							onPress={async () => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								await onLogin(props.route.params?.deviceId);
							}}>
							<Text style={{color: 'white', fontSize: 20}}>
								{' '}
								Configure{' '}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	input: {
		height: 50,
		fontSize: 20,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	spinnerTextStyle: {
		color: '#32404e',
		fontSize: 15,
		marginBottom: 50
	}
});
