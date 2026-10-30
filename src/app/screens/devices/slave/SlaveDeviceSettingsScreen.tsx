import React from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {faGear, faMicrochip} from '@fortawesome/free-solid-svg-icons';
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

export function SlaveDeviceSettingsScreen(props: any) {
	const {deviceRef, deleteItem, invalidSections, ready} = useDeviceEntity(
		props,
		'SLAVE',
		device => ({
			general: isEmpty(device?.name) || isEmpty(device?.config?.slaveId)
		})
	);

	return (
		<SettingsScrollView>
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={1}
					name={'General'}
					icon={faGear}
					defaultExpanded={props.route.params?.section === 'connectivity'}
					invalid={invalidSections.general}
					onPress={() => {}}>
					{ready && (
						<SlaveGeneralSettingsSection
							key={deviceRef.current.id}
							embedded
							deviceData={deviceRef.current}
							showErrors={invalidSections.general}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<MenuAccordion
					key={3}
					name={'Model'}
					icon={faMicrochip}
					onPress={() => {}}>
					{ready && <SlaveModelSection device={deviceRef.current} />}
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
	devices: state.root_device.devices
});

export default connect(mapStateToProps, {
	loadDevice,
	updateDevice,
	stageDevice
})(SlaveDeviceSettingsScreen);
