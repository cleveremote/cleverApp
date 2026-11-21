import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {
	GeneralSettingsFields,
	generalEmbeddedBoxStyle
} from '../../../components/common/GeneralSettingsFields';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {updateDevice} from '../../../../module/process/infrasctructure/store/actions/device';
import {useDeviceSection} from '../useDeviceSection';
import {toNumber} from '../deviceFieldUtils';
import {DeviceConnectivityStatus} from '../../../components/device/DeviceConnectivity';
import {isTempId} from '../../../../services/socket';
import i18n from 'i18next';

// Slave General: connectivity banner, Name and Description (shown via the
// info icon). The Modbus unit id (`config.slaveId`, read-only) is shown in the
// Model section.
// `type` = 'SLAVE' is a hidden field. `config.masterDeviceId` is a hidden,
// non-editable field seeded on creation and carried through untouched.
export function SlaveGeneralSettingsSection(props: any) {
	const transform = (data: any) => ({
		...data,
		config: {
			...data.config,
			slaveId: toNumber(data.config?.slaveId)
		}
	});

	const embedded = !!props.embedded;
	const {control, errors, markDirty} = useDeviceSection(props, transform, [
		'name',
		'description',
		'config'
	]);

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={[BoxFormStyle.boxForm, embedded && generalEmbeddedBoxStyle]}>
			<Body {...bodyProps}>
				{/* Bannière d'état de connexion (fine) en première position. */}
				{!isTempId(props.deviceData?.id) && (
					<View style={styles.banner}>
						<DeviceConnectivityStatus thin device={props.deviceData} />
					</View>
				)}
				<GeneralSettingsFields
					control={control}
					errors={errors}
					showErrors={props.showErrors}
					nameMaxLength={25}
					onEdit={() => markDirty()}
				/>
			</Body>
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {marginTop: 4, marginBottom: 2}
});

export default connect(null, {updateDevice})(SlaveGeneralSettingsSection);
