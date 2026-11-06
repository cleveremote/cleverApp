import React from 'react';
import {ScrollView, Text, TextInput, View} from 'react-native';
import {connect} from 'react-redux';
import {faMinus} from '@fortawesome/free-solid-svg-icons';
import {
	SelectForm,
	TextAreaForm
} from '../../../components/common/FormComponents';
import {elementStack} from '../../../components/cycle/moduleStack';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {InputStyle} from '../../../styles/components/common/Input';
import {updateModbusTask} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {comRequestTypeOptions} from '../../../data/modbusTypes';
import {useComRequestSection} from './useComRequestSection';
import i18n from 'i18next';

// Access mode deduced from the Modbus function(s) (`config.function`, a single
// value or a list): any "write*" one gives READ & WRITE, only "read*" ones give
// READ ONLY.
export function comRequestAccessLabel(fn: unknown): string {
	const fns = (Array.isArray(fn) ? fn : fn ? [fn] : []).map(f =>
		String(f).toLowerCase()
	);
	const read = fns.some(f => f.includes('read'));
	const write = fns.some(f => f.includes('write'));
	return write
		? i18n.t('devices:comRequest.readWrite')
		: read
		? i18n.t('devices:comRequest.readOnly')
		: '-';
}

// COM request General: Name (read-only label) + Description + the list of functions (`type`),
// plus read-only info from the Configuration section: the access mode (deduced
// from `config.function`) and the unit (`config.params.unit`, hidden if empty).
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

	// Embedded: `config` is edited live by the sibling Configuration section and
	// staged into the task, so read it from there rather than this form.
	const config = embedded ? props.comRequestData?.config : watch('config');
	const accessLabel = comRequestAccessLabel(config?.function);
	const unit = config?.params?.unit?.toString().trim();

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
				<Text style={InputStyle.textInput}>{i18n.t('devices:comRequest.name')}</Text>
				<ReadOnlyField value={watch('name') || '-'} />
				<Text style={InputStyle.textInput}>
					{i18n.t('devices:comRequest.accessMode')}
				</Text>
				<ReadOnlyField value={accessLabel} />
				{unit ? (
					<View style={styles.infoRow}>
						<Text style={InputStyle.textInput}>
							{i18n.t('sensor:config.unit')}
						</Text>
						<ReadOnlyField value={unit} style={styles.infoValue} />
					</View>
				) : null}
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder={i18n.t('common:form.description')}
					onChangeText={() => markDirty()}
				/>

				{/* <Text style={styles.subSectionTitle}>Functions</Text>
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
				/> */}
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
	},
	infoRow: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const
	},
	readOnlyField: {
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 12
	},
	infoValue: {
		flex: 1,
		marginLeft: 8
	}
};

// Valeur non modifiable : même rendu qu'un InputForm désactivé.
function ReadOnlyField({value, style}: Readonly<{value: string; style?: any}>) {
	return (
		<TextInput
			style={[
				InputStyle.input,
				styles.readOnlyField,
				InputStyle.inputDisabled,
				style
			]}
			value={value}
			editable={false}
		/>
	);
}

export default connect(null, {updateModbusTask})(
	ComRequestGeneralSettingsSection
);
