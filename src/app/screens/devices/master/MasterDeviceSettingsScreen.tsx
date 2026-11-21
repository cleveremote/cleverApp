import React from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {faNetworkWired, faSitemap} from '@fortawesome/free-solid-svg-icons';
import {
	DeleteItemMenu,
	MenuAccordion,
	MenuGroup
} from '../../../components/common/cycleMenu';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import {
	loadDevice,
	saveDeviceTree,
	updateDevice
} from '../../../../module/process/infrasctructure/store/actions/device';
import {loadModbusTasks} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {useDeviceEntity} from '../useDeviceEntity';
import {isEmpty} from '../../../components/common/useSectionSettingsHeader';
import MasterGeneralSettingsSection from './MasterGeneralSettingsSection';
import SlaveDevicesSection from './SlaveDevicesSection';
import {MasterConnectivitySection} from './MasterConnectivitySection';
import {generalContainerStyle} from '../../../components/common/GeneralSettingsFields';
import i18n from 'i18next';

export function MasterDeviceSettingsScreen(props: any) {
	const {deviceRef, deleteItem, invalidSections, ready} = useDeviceEntity(
		props,
		'MASTER',
		device => ({
			general: isEmpty(device?.name)
		})
	);

	return (
		<SettingsScrollView>
			{/* Général sorti du menu, sans carte blanche, en première position :
			    bannière de connexion, icône info + nom, description au toucher. */}
			{ready ? (
				<View style={generalContainerStyle}>
					<MasterGeneralSettingsSection
						key={deviceRef.current.id}
						embedded
						deviceData={deviceRef.current}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</View>
			) : null}
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={2}
					name={i18n.t('common:sections.connectivity')}
					icon={faNetworkWired}
					onPress={() => {}}>
					{ready && <MasterConnectivitySection device={deviceRef.current} />}
				</MenuAccordion>
				<MenuAccordion
					key={3}
					name={i18n.t('navigation:slaveDevices')}
					icon={faSitemap}
					defaultExpanded
					onPress={() => {}}>
					<SlaveDevicesSection
						embedded
						master={deviceRef.current}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<DeleteItemMenu key={4} OnConfirm={deleteItem} />
			</MenuGroup>
		</SettingsScrollView>
	);
}

const COLORS = {
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	container: {
		alignSelf: 'stretch'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	}
});

const mapStateToProps = (state: any) => ({
	device: state.root_device.device,
	devices: state.root_device.devices,
	modbusTasks: state.root_modbus_task.modbusTasks,
	modbusTasksLoaded: state.root_modbus_task.modbusTasksLoaded
});

export default connect(mapStateToProps, {
	loadDevice,
	updateDevice,
	saveDeviceTree,
	loadModbusTasks
})(MasterDeviceSettingsScreen);
