import React, {useEffect} from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {elementStack} from '../../../components/cycle/moduleStack';
import {hapticOptions} from '../../../data/cycleTypes';
import {loadModbusTasks} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {updateDevice} from '../../../../module/process/infrasctructure/store/actions/device';

// COM requests belong to their slave device. They are edited and staged into the
// slave's in-memory `comRequests` list (the slave lives in the shared
// `root_device.device` slot while its settings stack is open) and persisted only
// when the master device is saved (front/box/sync/device pushes each dirty
// slave). On first open we hydrate the slave's `comRequests` from the flat
// modbusTasks list (linked by `deviceId`) so already-saved requests show up.
export function ComRequestsSection(props: any) {
	const slaveId = props.route.params?.slaveId;
	const device = props.device;
	const isSlaveLoaded = !!device && `${device.id}` === `${slaveId}`;

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		props.loadModbusTasks();
	}, []);

	// Hydrate once from the flat list; keep in-memory edits/deletes on re-entry
	// (only seed when `comRequests` hasn't been attached to the slave yet).
	useEffect(() => {
		if (isSlaveLoaded && device.comRequests === undefined) {
			const mine = (props.modbusTasks ?? []).filter(
				(t: any) => `${t.deviceId}` === `${slaveId}`
			);
			props.updateDevice({...device, comRequests: mine});
		}
	}, [isSlaveLoaded, props.modbusTasks]);

	const comRequests = (device?.comRequests ?? []).filter(
		(cr: any) => !cr.delete
	);

	// `type` is a list of functions; fall back to the name (or a joined type
	// list) for the row label.
	const rowLabel = (cr: any) => {
		if (cr.name) return `${cr.name}`;
		if (Array.isArray(cr.type) && cr.type.length) return cr.type.join(', ');
		return 'request';
	};

	const createComRequest = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		props.navigation.navigate('ComRequestSettingsStack', {
			screen: 'ComRequestSettingsMenu',
			params: {slaveId, defaults: {deviceId: slaveId, type: []}}
		});
	};

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				<View style={styles.card}>
					{comRequests.map((cr: any) =>
						elementStack(
							cr,
							(item: any) => {
								props.navigation.navigate(
									'ComRequestSettingsStack',
									{
										screen: 'ComRequestSettingsMenu',
										params: {slaveId, comRequestId: item.id}
									}
								);
							},
							rowLabel(cr),
							{name: faCog, color: styles.icon.color}
						)
					)}
					<View style={styles.addRow}>
						<TouchableOpacity
							style={styles.addButton}
							onPress={createComRequest}>
							<Icon name="times-circle" style={styles.icon} />
						</TouchableOpacity>
						<Text style={styles.addLabel}>
							Add new COM request ...
						</Text>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	screen: {
		flex: 1
	},
	container: {
		gap: 8,
		alignSelf: 'stretch',
		padding: 20
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
	device: state.root_device.device,
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {loadModbusTasks, updateDevice})(
	ComRequestsSection
);
