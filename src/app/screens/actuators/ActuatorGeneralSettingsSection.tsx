import React from 'react';
import {ScrollView, View} from 'react-native';
import {connect} from 'react-redux';
import {
	InputForm,
	TextAreaForm
} from '../../components/common/FormComponents';
import {BoxFormStyle} from '../../styles/components/common/boxForm';
import {updateActuator} from '../../../module/process/infrasctructure/store/actions/actuator';
import {useActuatorSection} from './useActuatorSection';
import i18n from 'i18next';

// Actuator General: Name + Description. Le type est porté par la section
// Configuration, dont il détermine les champs.
export function ActuatorGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const {control, errors, markDirty} = useActuatorSection(props, undefined, [
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
					placeholder={i18n.t('common:form.name')}
					rules={{required: i18n.t('common:form.nameRequired')}}
					onChangeText={() => markDirty()}
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

export default connect(null, {updateActuator})(ActuatorGeneralSettingsSection);
