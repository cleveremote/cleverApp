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
import {DeviceConnectivityStatus} from '../../../components/device/DeviceConnectivity';
import {isTempId} from '../../../../services/socket';
import i18n from 'i18next';

// Master General: connectivity banner, Name and Description (shown via the
// info icon). `type` = 'MASTER' is a hidden field — seeded via defaultValues
// (route.params.deviceData) and never rendered. IP address and port live in the
// Connectivity section (MasterConnectivitySection).
export function MasterGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const {control, errors, markDirty} = useDeviceSection(props, undefined, [
		'name',
		'description'
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

export default connect(null, {updateDevice})(MasterGeneralSettingsSection);
