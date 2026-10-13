import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {faMinus} from '@fortawesome/free-solid-svg-icons';
import {
	InputForm,
	SelectForm,
	TextAreaForm
} from '../../../components/common/FormComponents';
import {elementStack} from '../../../components/cycle/moduleStack';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {updateModbusTask} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {comRequestTypeOptions} from '../../../data/modbusTypes';
import {useComRequestSection} from './useComRequestSection';

// COM request General: Name + Description + the list of functions (`type`).
// `type` is a collection of ComRequestType values: the already-selected ones are
// listed with a remove (minus) button and new ones are added from a dropdown of
// the remaining options (same add/remove pattern as SequenceActuatorsSettings).
export function ComRequestGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const {control, errors, watch, setValue, markDirty} = useComRequestSection(
		props,
		undefined,
		['name', 'description', 'type']
	);

	// `type` is stored as an array; tolerate a legacy single value / undefined.
	const rawType = watch('type');
	const selectedTypes: string[] = Array.isArray(rawType)
		? rawType
		: rawType
		? [rawType]
		: [];

	const availableOptions = comRequestTypeOptions.filter(
		o => !selectedTypes.includes(o.value)
	);

	const addType = (value: string) => {
		if (!value || selectedTypes.includes(value)) return;
		setValue('type', [...selectedTypes, value], {shouldDirty: true});
		markDirty();
	};

	const removeType = (value: string) => {
		setValue(
			'type',
			selectedTypes.filter(t => t !== value),
			{shouldDirty: true}
		);
		markDirty();
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
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={() => markDirty()}
				/>

				<Text style={styles.subSectionTitle}>Functions</Text>
				{selectedTypes.map(type =>
					elementStack(
						{id: type},
						() => removeType(type),
						type,
						{name: faMinus, color: 'red'}
					)
				)}
				<SelectForm
					lstData={availableOptions}
					control={control}
					errors={errors}
					name="_addType"
					placeholder="Add function ..."
					onValueChange={value => addType(value)}
				/>
			</Body>
		</View>
	);
}

const styles = {
	subSectionTitle: {
		color: '#32404e',
		fontSize: 15,
		fontWeight: 'bold' as const,
		marginTop: 16,
		marginBottom: 8
	}
};

export default connect(null, {updateModbusTask})(
	ComRequestGeneralSettingsSection
);
