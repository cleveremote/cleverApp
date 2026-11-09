import React from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {
	faBolt,
	faGauge,
	faMicrochip,
	faPlug
} from '@fortawesome/free-solid-svg-icons';
import {
	DeleteItemMenu,
	MenuAccordion,
	MenuGroup
} from '../../../components/common/cycleMenu';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import {
	loadDevice,
	stageDevice,
	updateDevice
} from '../../../../module/process/infrasctructure/store/actions/device';
import {useDeviceEntity} from '../useDeviceEntity';
import {isEmpty} from '../../../components/common/useSectionSettingsHeader';
import SlaveGeneralSettingsSection from './SlaveGeneralSettingsSection';
import SlaveModelSection from './SlaveModelSection';
import SlaveActuatorsSection, {
	hasActuatorsSection
} from './SlaveActuatorsSection';
import SlaveSensorsSection, {hasSensorsSection} from './SlaveSensorsSection';
import SlaveInverterSection, {
	hasInverterSection
} from './SlaveInverterSection';
import {generalContainerStyle} from '../../../components/common/GeneralSettingsFields';
import i18n from 'i18next';

export function SlaveDeviceSettingsScreen(props: any) {
	const {deviceRef, deleteItem, invalidSections, ready} = useDeviceEntity(
		props,
		'SLAVE',
		device => ({
			// L'ID esclave (lecture seule) est affiché dans la section Modèle.
			general: isEmpty(device?.name)
		})
	);

	return (
		<SettingsScrollView>
			{/* Général sorti du menu, sans carte blanche, en première position :
			    bannière de connexion, icône info + nom, description au toucher. */}
			{ready ? (
				<View style={generalContainerStyle}>
					<SlaveGeneralSettingsSection
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
					name={i18n.t('devices:model.title')}
					icon={faMicrochip}
					onPress={() => {}}>
					{ready && <SlaveModelSection device={deviceRef.current} />}
				</MenuAccordion>
				{ready && hasActuatorsSection(props.models, deviceRef.current) && (
					<MenuAccordion
						key={3}
						name={i18n.t('common:sections.actuators')}
						icon={faPlug}
						onPress={() => {}}>
						<SlaveActuatorsSection
							device={deviceRef.current}
							navigation={props.navigation}
						/>
					</MenuAccordion>
				)}
				{ready && hasSensorsSection(props.models, deviceRef.current) && (
					<MenuAccordion
						key={4}
						name={i18n.t('common:sections.sensors')}
						icon={faGauge}
						onPress={() => {}}>
						<SlaveSensorsSection
							device={deviceRef.current}
							navigation={props.navigation}
						/>
					</MenuAccordion>
				)}
				{ready &&
					hasInverterSection(
						props.models,
						deviceRef.current,
						props.inverters
					) && (
						<MenuAccordion
							key={5}
							name={i18n.t('devices:inverter.title')}
							icon={faBolt}
							onPress={() => {}}>
							<SlaveInverterSection device={deviceRef.current} />
						</MenuAccordion>
					)}
				<DeleteItemMenu key={6} OnConfirm={deleteItem} />
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
	models: state.root_device_model.models,
	inverters: state.root_inverter.inverters
});

export default connect(mapStateToProps, {
	loadDevice,
	updateDevice,
	stageDevice
})(SlaveDeviceSettingsScreen);
