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

// Slave General: Name + Description. `type` = 'SLAVE' is a hidden field.
export function SlaveGeneralSettingsSection(props: any) {
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
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={25}
					placeholder="Name*"
					rules={{required: 'Name is required'}}
					onChangeText={() => markDirty()}
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
