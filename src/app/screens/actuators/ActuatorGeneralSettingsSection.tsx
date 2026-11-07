import React from 'react';
import {ScrollView, View} from 'react-native';
import {connect} from 'react-redux';
import {
	GeneralSettingsFields,
	generalEmbeddedBoxStyle
} from '../../components/common/GeneralSettingsFields';
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
		<View style={[BoxFormStyle.boxForm, embedded && generalEmbeddedBoxStyle]}>
			<Body {...bodyProps}>
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

export default connect(null, {updateActuator})(ActuatorGeneralSettingsSection);
