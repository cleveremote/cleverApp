import React, {useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {elementStack} from '../../components/cycle/moduleStack';
import {hapticOptions} from '../../data/cycleTypes';
import {
	discoverDevices,
	loadDevices
} from '../../../module/process/infrasctructure/store/actions/device';

// Top level of the Devices area: the list of Master devices (white card +
// elementStack rows) plus a "Discover Devices" action — masters are added by
// a box-side discovery (no masterId), not created manually.
export function DevicesScreen(props: any) {
	// Discovery en cours : loader sur le bouton jusqu'à la réponse de la box
	// (la liste se met à jour via ROOT_DEVICES_LOAD). Le socket n'a pas de
	// timeout, d'où un garde-fou pour ne pas bloquer le bouton indéfiniment.
	const [discovering, setDiscovering] = useState(false);
	const discoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (discoverTimeout.current) clearTimeout(discoverTimeout.current);
		},
		[]
	);

	const startDiscovery = () => {
		setDiscovering(true);
		const done = () => {
			if (discoverTimeout.current) clearTimeout(discoverTimeout.current);
			discoverTimeout.current = null;
			setDiscovering(false);
		};
		discoverTimeout.current = setTimeout(() => {
			discoverTimeout.current = null;
			setDiscovering(false);
			Alert.alert(
				'Discovery timed out',
				'The box did not answer. Check the connection and try again.'
			);
		}, DISCOVERY_TIMEOUT_MS);
		props.discoverDevices(undefined, done);
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		// Initial load, then reload every time the screen regains focus so
		// edits made in the device settings sub-navigator are reflected when
		// the user comes back to the list.
		props.loadDevices();
		const unsubscribe = props.navigation.addListener('focus', () => {
			props.loadDevices();
		});
		return unsubscribe;
	}, []);

	const masters = (props.devices ?? []).filter(
		(d: any) => d.type === 'MASTER' && !d.delete
	);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{masters.map((master: any) =>
					elementStack(
						master,
						(item: any) => {
							props.navigation.navigate(
								'MasterDeviceSettingsStack',
								{
									screen: 'MasterDeviceSettingsMenu',
									params: {deviceId: item.id}
								}
							);
						},
						`${master.name ?? 'device'}`,
						{name: faCog, color: styles.icon.color}
					)
				)}
				<TouchableOpacity
					style={[
						styles.discoverButton,
						discovering && styles.discoverButtonBusy
					]}
					disabled={discovering}
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						startDiscovery();
					}}>
					{discovering ? (
						<ActivityIndicator size="small" color={COLORS.onPrimary} />
					) : (
						<FontAwesomeIcon
							icon={faMagnifyingGlass}
							size={16}
							color={COLORS.onPrimary}
						/>
					)}
					<Text style={styles.discoverLabel}>
						{discovering ? 'Discovering…' : 'Discover new devices'}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const DISCOVERY_TIMEOUT_MS = 60000;

const COLORS = {
	primary: '#32404e',
	shadow: '#000',
	cardBackground: 'white',
	onPrimary: 'white'
};

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		margin: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	discoverButton: {
		marginTop: 20,
		marginHorizontal: 8,
		paddingVertical: 12,
		borderRadius: 12,
		backgroundColor: COLORS.primary,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8
	},
	discoverButtonBusy: {
		opacity: 0.7
	},
	discoverLabel: {
		color: COLORS.onPrimary,
		fontSize: 15,
		fontWeight: 'bold'
	},
	icon: {
		color: COLORS.primary,
		fontSize: 30
	}
});

const mapStateToProps = (state: any) => ({
	devices: state.root_device.devices
});

export default connect(mapStateToProps, {
	loadDevices,
	discoverDevices
})(DevicesScreen);
