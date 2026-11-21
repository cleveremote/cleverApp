import React, {useEffect} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {elementStack} from '../../../components/cycle/moduleStack';
import {loadModbusTasks} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {updateDevice} from '../../../../module/process/infrasctructure/store/actions/device';

// COM requests belong to their slave device. They are edited and staged into the
// slave's in-memory `comRequests` list (the slave lives in the shared
// `root_device.device` slot while its settings stack is open) and persisted only
// when the master device is saved (front/box/sync/device pushes each dirty
// slave). On first open we hydrate the slave's `comRequests` from the flat
// modbusTasks list (linked by `deviceId`) so already-saved requests show up.
//
// Peut être rendue en écran plein (navigation) ou embarquée inline dans
// l'accordéon « COM Requests » du slave (`embedded` + `slaveId` en props).
export function ComRequestsSection(props: any) {
	const embedded = !!props.embedded;
	const slaveId = embedded ? props.slaveId : props.route.params?.slaveId;
	const device = props.device;
	const isSlaveLoaded = !!device && `${device.id}` === `${slaveId}`;

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

	const list = (
		<View style={embedded ? styles.embeddedCard : styles.card}>
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
		</View>
	);

	if (embedded) return list;

	return (
		<View style={styles.screen}>
			<ScrollView contentContainerStyle={styles.container}>
				{list}
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
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas d'ombre ni de
	// marge, juste un peu de padding autour de la liste.
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		padding: 8,
		paddingBottom: 16
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
