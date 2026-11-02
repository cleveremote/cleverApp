import React from 'react';
import {ScrollView, View} from 'react-native';
import {connect} from 'react-redux';
import {
	InputForm,
	TextAreaForm
} from '../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {updateDevice} from '../../../../module/process/infrasctructure/store/actions/device';
import {useDeviceSection} from '../useDeviceSection';
import {DeviceConnectivityStatus} from '../../../components/device/DeviceConnectivity';
import {isTempId} from '../../../../services/socket';
import i18n from 'i18next';

// Master General: Name, IP address + port (`config.ipAddress` / `config.port`,
// read-only) and Description. `type` = 'MASTER' is a hidden field — seeded via
// defaultValues (route.params.deviceData) and never rendered. `config` is not
// an owned field: the read-only connection values are never staged.
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
		<View style={BoxFormStyle.boxForm}>
			<Body {...bodyProps}>
				{!isTempId(props.deviceData?.id) && (
					<DeviceConnectivityStatus device={props.deviceData} />
				)}
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={25}
					placeholder={i18n.t('common:form.name')}
					rules={{required: i18n.t('common:form.nameRequired')}}
					onChangeText={() => markDirty()}
				/>
				<View style={{flexDirection: 'row', gap: 10}}>
					<View style={{flex: 2}}>
						<InputForm
							control={control}
							errors={errors}
							name="config.ipAddress"
							placeholder={i18n.t('devices:ipAddress')}
							disabled
						/>
					</View>
					<View style={{flex: 1}}>
						<InputForm
							control={control}
							errors={errors}
							name="config.port"
							placeholder={i18n.t('devices:port')}
							keyboardType="numeric"
							disabled
						/>
					</View>
				</View>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder={i18n.t('common:form.description')}
					onChangeText={() => markDirty()}
				/>
			</Body>
		</View>
	);
}

export default connect(null, {updateDevice})(MasterGeneralSettingsSection);
