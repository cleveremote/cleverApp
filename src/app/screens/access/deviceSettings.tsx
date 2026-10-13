import React, {useEffect} from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	Alert,
	TextInput,
	TouchableOpacity,
	View,
	Modal,
	FlatList
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {placeholderColor} from '../../styles/components/common/Input';
import {hapticOptions} from '../../data/cycleTypes';
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
import {
	PendingCoordinates,
	startLocalCoordinates
} from '../../../services/geolocation/GeolocationService';

/**
 * Ce que la soumission accepte encore d'attendre pour la position, si elle
 * n'est pas déjà arrivée. Court : la box se configure très bien sans, et le
 * lien BLE ne gagne rien à rester ouvert pendant ce temps.
 */
const COORDINATES_GRACE_MS = 2000;

export function DeviceSettings(props: any) {
	const [psk, setPsk] = React.useState('');
	const [ssid, setSsid] = React.useState('1');
	const [password, setPassword] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);
	const [profile, setProfile] = React.useState('New profile');
	const [networks, setNetworks] = React.useState<{label: string; value: string}[]>([]);
	const [dropdownOpen, setDropdownOpen] = React.useState(false);

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

	// Position demandée dès l'affichage plutôt qu'au moment d'envoyer : voir
	// `startLocalCoordinates`. L'attente se superpose ainsi à la lecture des
	// réseaux en BLE et à la saisie du formulaire.
	const coordinatesRef = React.useRef<PendingCoordinates | undefined>(
		undefined
	);
	useEffect(() => {
		coordinatesRef.current = startLocalCoordinates();
	}, []);

	const onLogin = async (deviceId: string) => {
		setIsLoading(true);
		const Buffer = require('buffer').Buffer;
		// Best effort: the box is configured even when the GPS is unavailable,
		// the field is simply omitted then.
		const localCoordinates = await coordinatesRef.current?.take(
			COORDINATES_GRACE_MS
		);
		const data = {
			ssid: ssid,
			psk: psk,
			password: password,
			...(localCoordinates ? {localCoordinates} : {})
		};
		const dataStr = JSON.stringify(data);
		const encodedAuth = new Buffer(dataStr).toString('base64');

		await BLEService.connectToDevice(deviceId)
			.then(async () => {
				await BLEService.discoverAllServicesAndCharacteristicsForDevice();
				// The payload now carries the coordinates too: make sure the
				// negotiated MTU is large enough. A failed negotiation must not
				// abort the configuration.
				try {
					await BLEService.requestMTUForDevice(512);
				} catch (error) {
					console.warn('MTU negotiation failed', error);
				}
			})
			.then(async device => {
				await BLEService.writeCharacteristicWithResponseForDevice(
					'22222222-3333-4444-5555-666666666666',
					'22222222-3333-4444-5555-666666666669',
					encodedAuth
				);
				await saveSigninData(
					profile,
					"ZJzzA6Di",
					// L'appairage BLE ne demande pas d'identifiant : le nom de
					// la box en tient lieu, comme avant.
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
					alignSelf: 'stretch'
				}}>
				<View
					style={{
						alignSelf: 'stretch',
						backgroundColor: 'white',
						marginTop: 8,
						marginHorizontal: 20,
						elevation: 3,
						shadowColor: '#000',
						shadowOffset: {width: 0, height: 1},
						shadowOpacity: 0.22,
						shadowRadius: 2.22,
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
							placeholderTextColor={placeholderColor}
							value={profile}
							onChangeText={value => {
								setProfile(value);
							}}
						/>
						<View style={{width: '100%'}}>
								<TouchableOpacity
									style={[styles.input, {justifyContent: 'center'}]}
									onPress={() => setDropdownOpen(!dropdownOpen)}>
									<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
										<Text style={{fontSize: 20, color: ssid ? '#000' : placeholderColor}}>
											{networks.find((n: any) => n.value === ssid)?.label || 'Select network'}
										</Text>
										<Icon name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#32404e" />
									</View>
								</TouchableOpacity>
								{dropdownOpen && (
									<View style={styles.dropdown}>
										<FlatList
											data={networks}
											keyExtractor={(_item, index) => 'network_' + index}
											renderItem={({item}: {item: any}) => (
												<TouchableOpacity
													style={[
														styles.dropdownItem,
														item.value === ssid && {backgroundColor: '#EDF2F7'}
													]}
													onPress={() => {
														setSsid(item.value);
														setDropdownOpen(false);
													}}>
													<Text style={{fontSize: 18}}>{item.label}</Text>
												</TouchableOpacity>
											)}
										/>
									</View>
								)}
							</View>
						<TextInput
							style={[styles.input, {width: '100%'}]}
							placeholder="Psk"
							placeholderTextColor={placeholderColor}
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
							placeholderTextColor={placeholderColor}
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
	},
	dropdown: {
		width: '100%',
		maxHeight: 200,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderTopWidth: 0,
		borderBottomLeftRadius: 12,
		borderBottomRightRadius: 12,
		backgroundColor: 'white'
	},
	dropdownItem: {
		paddingVertical: 12,
		paddingHorizontal: 12
	}
});
