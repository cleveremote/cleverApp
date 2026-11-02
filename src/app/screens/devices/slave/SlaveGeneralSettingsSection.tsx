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
import {toNumber} from '../deviceFieldUtils';
import {DeviceConnectivityStatus} from '../../../components/device/DeviceConnectivity';
import {isTempId} from '../../../../services/socket';
import i18n from 'i18next';

// Slave General: Name, Modbus unit id (`config.slaveId`, read-only) and
// Description.
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
				<InputForm
					control={control}
					errors={errors}
					name="config.slaveId"
					placeholder={i18n.t('devices:slaveId')}
					keyboardType="numeric"
					rules={{required: i18n.t('devices:slaveIdRequired')}}
					disabled
				/>
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

export default connect(null, {updateDevice})(SlaveGeneralSettingsSection);
