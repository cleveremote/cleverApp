import React, {useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	StyleSheet, Text, TouchableOpacity,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog, faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {elementStack} from '../../../components/cycle/moduleStack';
import {hapticOptions} from '../../../data/cycleTypes';
import {isTempId} from '../../../../services/socket';
import {
	discoverDevices,
	loadDevices
} from '../../../../module/process/infrasctructure/store/actions/device';

// Slave devices attached to a master, rendered like the Triggers list, plus a
// "Discover New Devices" action that asks the box to probe the master's
// discoveryRegisters and register any newly-found units. Discovery is the only
// way to add slaves — there is no manual "add new slave" entry.
//
// Peut être rendue en écran plein (navigation) ou embarquée inline dans
// l'accordéon « Slave Devices » du master (`embedded` + `master` en props).
export function SlaveDevicesSection(props: any) {
	const embedded = !!props.embedded;
	const masterRef = useRef(embedded ? props.master : props.route.params.master);
	masterRef.current = embedded ? props.master : props.route.params.master;

	// Discovery en cours : loader sur le bouton jusqu'à la réponse de la box
	// (la liste se rafraîchit via ROOT_DEVICES_LOAD). Le socket n'a pas de
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
		props.discoverDevices(masterRef.current.id, done);
	};

	useEffect(() => {
		if (!embedded) {
			props.navigation.setOptions({
				headerLeft: () =>
					navigationHeader(
						() => props.navigation.goBack(),
						'arrow-alt-circle-left',
						false
					)
			});
		}
		props.loadDevices();
	}, []);

	// Slaves reference their master by id, so a not-yet-persisted (temp id)
	// master can't own slaves — nudge the user to save it first.
	const requireSavedMaster = (): boolean => {
		if (isTempId(masterRef.current?.id)) {
			Alert.alert(
				'Save the master first',
				'Go back once to save this master device before adding or discovering slaves.'
			);
			return false;
		}
		return true;
	};

	// Slaves are the SLAVE-typed config devices whose `config.masterDeviceId`
	// references this master. String-coerce both sides so ObjectId/string ids
	// compare reliably.
	const masterId = masterRef.current?.id;
	const slaves = (props.devices ?? []).filter(
		(d: any) =>
			d.type === 'SLAVE' &&
			d.config?.masterDeviceId &&
			`${d.config.masterDeviceId}` === `${masterId}` &&
			!d.delete
	);

	return (
		<View style={embedded ? styles.embeddedContainer : styles.container}>
			<View style={embedded ? styles.embeddedCard : styles.card}>
				{slaves.map((slave: any) =>
					elementStack(
						slave,
						(item: any) => {
							props.navigation.navigate(
								'SlaveDeviceSettingsStack',
								{
									screen: 'SlaveDeviceSettingsMenu',
									params: {deviceId: item.id}
								}
							);
						},
						`${slave.name ?? 'slave'}`,
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
						if (!requireSavedMaster()) return;
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

const DISCOVERY_TIMEOUT_MS = 10000;

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
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas de marge ni
	// d'ombre, juste un peu de padding autour de la liste et du bouton Discover.
	embeddedContainer: {
		alignSelf: 'stretch'
	},
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		padding: 8,
		paddingBottom: 16
	},
	icon: {
		color: COLORS.primary,
		fontSize: 30
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
	}
});

const mapStateToProps = (state: any) => ({
	devices: state.root_device.devices
});

export default connect(mapStateToProps, {
	loadDevices,
	discoverDevices
})(SlaveDevicesSection);
