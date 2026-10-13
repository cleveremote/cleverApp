import React, {useEffect} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {elementStack} from '../../components/cycle/moduleStack';
import {hapticOptions} from '../../data/cycleTypes';
import {MasterProtocol} from '../../data/modbusTypes';
import {loadDevices} from '../../../module/process/infrasctructure/store/actions/device';

// Top level of the Devices area: the list of Master devices. Same visual list
// as the Triggers screen (white card + elementStack rows + a rotated "+" row).
export function DevicesScreen(props: any) {
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
				<View style={styles.addRow}>
					<TouchableOpacity
						style={styles.addButton}
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate(
								'MasterDeviceSettingsStack',
								{
									screen: 'MasterDeviceSettingsMenu',
									params: {
								defaults: {
									type: 'MASTER',
									config: {protocol: MasterProtocol.TCP}
								}
							}
								}
							);
						}}>
						<Icon name="times-circle" style={styles.icon} />
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new master ...</Text>
				</View>
			</View>
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	shadow: '#000',
	cardBackground: 'white'
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
	addRow: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: COLORS.primary,
		fontSize: 15
	},
	icon: {
		color: COLORS.primary,
		fontSize: 30
	}
});

const mapStateToProps = (state: any) => ({
	devices: state.root_device.devices
});

export default connect(mapStateToProps, {loadDevices})(DevicesScreen);
