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
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={25}
					placeholder="Name*"
					rules={{required: 'Name is required'}}
					onChangeText={() => markDirty()}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="config.slaveId"
					placeholder="Slave ID*"
					keyboardType="numeric"
					rules={{required: 'Slave ID is required'}}
					disabled
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={() => markDirty()}
				/>
			</Body>
		</View>
	);
}

export default connect(null, {updateDevice})(SlaveGeneralSettingsSection);
