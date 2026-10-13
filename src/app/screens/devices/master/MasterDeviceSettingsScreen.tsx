import React from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {faGear, faSitemap, faSliders} from '@fortawesome/free-solid-svg-icons';
import {
	DeleteItemMenu,
	MenuAccordion
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
import {MasterProtocol} from '../../../data/modbusTypes';
import MasterGeneralSettingsSection from './MasterGeneralSettingsSection';
import MasterConfigurationSettingsSection from './MasterConfigurationSettingsSection';
import SlaveDevicesSection from './SlaveDevicesSection';

// La section Configuration est « not valid » quand ses champs requis (selon le
// protocole) ne sont pas renseignés — mêmes règles que le sous-formulaire. Le
// protocole est pré-rempli à TCP à la création, donc le tester seul ne suffit
// pas : il faut aussi contrôler ipAddress/port (TCP) ou path (série).
const isMasterConfigInvalid = (config: any): boolean => {
	const protocol = config?.protocol;
	if (isEmpty(protocol)) return true;
	if (protocol === MasterProtocol.TCP) {
		return isEmpty(config?.ipAddress) || isEmpty(config?.port);
	}
	if (protocol === MasterProtocol.RTU || protocol === MasterProtocol.ASCII) {
		return isEmpty(config?.path);
	}
	return false;
};

export function MasterDeviceSettingsScreen(props: any) {
	const {deviceRef, deleteItem, invalidSections, ready} = useDeviceEntity(
		props,
		'MASTER',
		device => ({
			general: isEmpty(device?.name),
			configuration: isMasterConfigInvalid(device?.config)
		})
	);

	return (
		<SettingsScrollView>
			<View style={styles.card}>
				<MenuAccordion
					key={1}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					{ready && (
						<MasterGeneralSettingsSection
							key={deviceRef.current.id}
							embedded
							deviceData={deviceRef.current}
							showErrors={invalidSections.general}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<MenuAccordion
					key={2}
					name={'Configuration'}
					icon={faSliders}
					invalid={invalidSections.configuration}
					onPress={() => {}}>
					{ready && (
						<MasterConfigurationSettingsSection
							key={deviceRef.current.id}
							embedded
							deviceData={deviceRef.current}
							showErrors={invalidSections.configuration}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<MenuAccordion
					key={3}
					name={'Slave Devices'}
					icon={faSitemap}
					onPress={() => {}}>
					<SlaveDevicesSection
						embedded
						master={deviceRef.current}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<DeleteItemMenu key={4} OnConfirm={deleteItem} />
			</View>
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
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {
	loadDevice,
	updateDevice,
	saveDeviceTree,
	loadModbusTasks
})(MasterDeviceSettingsScreen);
