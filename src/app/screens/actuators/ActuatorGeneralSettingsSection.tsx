import React from 'react';
import {ScrollView, View} from 'react-native';
import {connect} from 'react-redux';
import {
	InputForm,
	SelectForm,
	TextAreaForm
} from '../../components/common/FormComponents';
import {BoxFormStyle} from '../../styles/components/common/boxForm';
import {updateActuator} from '../../../module/process/infrasctructure/store/actions/actuator';
import {isTempId} from '../../../services/socket';
import {actuatorTypeOptions, emptyActuatorConfig} from '../../data/actuatorTypes';
import {useActuatorSection} from './useActuatorSection';

// Actuator General: Name + Description + Type. Le type détermine la forme de la
// config (RPI / COM / CTRL) : il n'est modifiable qu'à la création, comme le
// type d'une COM request. Le changer réinitialise la config avec les valeurs par
// défaut du nouveau type (la section Configuration est remontée par l'écran
// parent, qui la keye sur le type).
export function ActuatorGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.actuatorData
		: props.route.params?.actuatorData;
	const {control, errors, markDirty} = useActuatorSection(props, undefined, [
		'name',
		'description',
		'type'
	]);

	const isNew = isTempId(source?.id);

	const onTypeChange = (value: string) => {
		markDirty();
		props.updateActuator({
			...(embedded ? props.actuatorData : source),
			type: value,
			config: emptyActuatorConfig(value),
			isModified: true
		});
	};

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
				<SelectForm
					lstData={actuatorTypeOptions}
					control={control}
					errors={errors}
					name="type"
					placeholder="Type*"
					disabled={!isNew}
					rules={{required: 'Type is required'}}
					onValueChange={onTypeChange}
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

export default connect(null, {updateActuator})(ActuatorGeneralSettingsSection);
