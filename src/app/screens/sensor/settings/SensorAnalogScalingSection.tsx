import React from 'react';
import i18n from 'i18next';
import {Text, View} from 'react-native';
import {useForm} from 'react-hook-form';
import {connect} from 'react-redux';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {InputForm, SelectForm} from '../../../components/common/FormComponents';
import {useEmbeddedSection} from '../../../components/common/useSectionSettingsHeader';
import {updateSensor} from '../../../../module/process/infrasctructure/store/actions/sensor';
import {
	SCALING_NUMBER_FIELDS,
	emptyScaling,
	outOfRangeOptions,
	signalTypeOptions,
	signalUnit
} from '../../../data/analogTypes';
import {toNumber} from '../../devices/deviceFieldUtils';

const mutedColor = '#8a96a3';

const withUnit = (label: string, unit?: string) =>
	unit ? `${label} (${unit})` : label;

const requiredNumber = (label: string) => ({
	required: i18n.t('sensor:analog.fieldRequired', {field: label}),
	validate: (v: any) =>
		!Number.isNaN(Number(v)) || i18n.t('sensor:analog.mustBeNumber')
});

// Section « Scaling » d'un sensor ANALOG : conversion linéaire de la valeur
// lue (`config.scaling`). Embarquée dans l'écran du sensor, elle stage
// l'échelle dans le sensor ; l'écran parent la sauvegarde.
export function SensorAnalogScalingSection(props: any) {
	const parentRef = React.useRef(props.sensorData);
	parentRef.current = props.sensorData;

	const {
		control,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm<any>({
		defaultValues: {
			scaling: {...emptyScaling(), ...props.sensorData?.config?.scaling}
		},
		mode: 'onChange'
	});

	useEmbeddedSection({
		embedded: true,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		// Les saisies sont des chaînes : on recoerce les bornes avant de stager.
		stage: values => {
			const scaling: Record<string, any> = {...values.scaling};
			SCALING_NUMBER_FIELDS.forEach(field => {
				scaling[field] = toNumber(scaling[field]);
			});
			props.updateSensor({
				...parentRef.current,
				config: {...parentRef.current?.config, scaling},
				isModified: true
			});
		}
	});

	const inputUnit = signalUnit(watch('scaling.signalType'));
	const outputUnit = watch('scaling.unit');

	return (
		<View style={BoxFormStyle.boxForm}>
			<SelectForm
				lstData={signalTypeOptions}
				control={control}
				errors={errors}
				name="scaling.signalType"
				placeholder={i18n.t('sensor:analog.signalType')}
				rules={{required: i18n.t('sensor:analog.signalTypeRequired')}}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.inputMin"
				placeholder={withUnit(`${i18n.t('sensor:analog.inputMin')}*`, inputUnit)}
				keyboardType="numeric"
				rules={requiredNumber(i18n.t('sensor:analog.inputMin'))}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.inputMax"
				placeholder={withUnit(`${i18n.t('sensor:analog.inputMax')}*`, inputUnit)}
				keyboardType="numeric"
				rules={{
					...requiredNumber(i18n.t('sensor:analog.inputMax')),
					validate: (v: any) =>
						Number.isNaN(Number(v))
							? i18n.t('sensor:analog.mustBeNumber')
							: Number(v) !==
									Number(getValues('scaling.inputMin')) ||
							  i18n.t('sensor:analog.inputMaxDiffers')
				}}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.unit"
				placeholder={i18n.t('sensor:analog.unit')}
				rules={{required: i18n.t('sensor:analog.unitRequired')}}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.outputMin"
				placeholder={withUnit(`${i18n.t('sensor:analog.outputMin')}*`, outputUnit)}
				keyboardType="numeric"
				rules={requiredNumber(i18n.t('sensor:analog.outputMin'))}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.outputMax"
				placeholder={withUnit(`${i18n.t('sensor:analog.outputMax')}*`, outputUnit)}
				keyboardType="numeric"
				rules={requiredNumber(i18n.t('sensor:analog.outputMax'))}
			/>
			<SelectForm
				lstData={outOfRangeOptions}
				control={control}
				errors={errors}
				name="scaling.outOfRange"
				placeholder={i18n.t('sensor:analog.outOfRangeLabel')}
				rules={{required: i18n.t('sensor:analog.outOfRangeRequired')}}
			/>
			<Text style={{color: mutedColor, fontSize: 12, marginTop: 6}}>
				{i18n.t('sensor:analog.invertedHint')}
			</Text>
		</View>
	);
}

export default connect(null, {updateSensor})(SensorAnalogScalingSection);
