import React from 'react';
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
	required: `${label} is required`,
	validate: (v: any) => !Number.isNaN(Number(v)) || 'Must be a number'
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
				placeholder="Signal type*"
				rules={{required: 'Signal type is required'}}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.inputMin"
				placeholder={withUnit('Input min*', inputUnit)}
				keyboardType="numeric"
				rules={requiredNumber('Input min')}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.inputMax"
				placeholder={withUnit('Input max*', inputUnit)}
				keyboardType="numeric"
				rules={{
					...requiredNumber('Input max'),
					validate: (v: any) =>
						Number.isNaN(Number(v))
							? 'Must be a number'
							: Number(v) !==
									Number(getValues('scaling.inputMin')) ||
							  'Input max must differ from input min'
				}}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.unit"
				placeholder="Unit*"
				rules={{required: 'Unit is required'}}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.outputMin"
				placeholder={withUnit('Output min*', outputUnit)}
				keyboardType="numeric"
				rules={requiredNumber('Output min')}
			/>
			<InputForm
				control={control}
				errors={errors}
				name="scaling.outputMax"
				placeholder={withUnit('Output max*', outputUnit)}
				keyboardType="numeric"
				rules={requiredNumber('Output max')}
			/>
			<SelectForm
				lstData={outOfRangeOptions}
				control={control}
				errors={errors}
				name="scaling.outOfRange"
				placeholder="Out of range*"
				rules={{required: 'Out of range policy is required'}}
			/>
			<Text style={{color: mutedColor, fontSize: 12, marginTop: 6}}>
				Inverted ranges are allowed (e.g. 4-20 mA → 10-0 bar).
			</Text>
		</View>
	);
}

export default connect(null, {updateSensor})(SensorAnalogScalingSection);
