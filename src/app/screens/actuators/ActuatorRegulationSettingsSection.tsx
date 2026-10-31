import React, {useRef} from 'react';
import {Text, View} from 'react-native';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import {faGear} from '@fortawesome/free-solid-svg-icons';
import {
	InputForm,
	SelectForm,
	SwitchForm
} from '../../components/common/FormComponents';
import {CollapsibleSection} from '../../components/common/CollapsibleSection';
import {useEmbeddedSection} from '../../components/common/useSectionSettingsHeader';
import {BoxFormStyle} from '../../styles/components/common/boxForm';
import {updateControlLoop} from '../../../module/process/infrasctructure/store/actions/control-loop';
import {
	ControlAlgorithm,
	algorithmOptions,
	emptyControlLoop,
	emptyControlParams,
	sensorUnit
} from '../../data/controlLoopTypes';
import {toNumber} from '../devices/deviceFieldUtils';

const PARAM_FIELDS = Object.keys(emptyControlParams());

const withUnit = (label: string, unit?: string) =>
	unit ? `${label} (${unit})` : label;

// Section « Regulation » des réglages d'une vanne CTRL : la ControlLoop de la
// vanne (capteur de retour, consigne, algorithme, gains). Embarquée dans
// l'écran de la vanne, elle stage la boucle dans `root_control_loop.loop` ;
// l'écran parent la sauvegarde avec la vanne. Sans boucle, une boucle
// désactivée est proposée : elle n'est créée qu'à la première modification.
export function ActuatorRegulationSettingsSection(props: any) {
	const actuator = props.actuatorData;
	const baseRef = useRef(
		props.loopData ?? {...emptyControlLoop(actuator), isEnabled: false}
	);
	const base = baseRef.current;

	const {
		control,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm<any>({
		defaultValues: {
			...base,
			params: {...emptyControlParams(), ...base.params}
		},
		mode: 'onChange'
	});

	// Les saisies sont des chaînes : on recoerce les nombres avant de stager.
	const toLoop = (values: any) => {
		const params: Record<string, any> = {...values.params};
		PARAM_FIELDS.forEach(field => {
			params[field] = toNumber(params[field]);
		});
		return {
			...base,
			...values,
			name: base.name ?? actuator?.name,
			actuatorId: actuator?.id,
			setpoint: toNumber(values.setpoint),
			params,
			isModified: true
		};
	};

	useEmbeddedSection({
		embedded: true,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: values => props.updateControlLoop(toLoop(values))
	});

	const isEnabled = !!watch('isEnabled');
	const algorithm = watch('algorithm');
	const sensorId = watch('sensorId');

	const sensors = (props.sensors ?? []).filter((s: any) => !s.delete);
	const sensorOptions = sensors.map((s: any) => ({
		label: s.name,
		value: s.id
	}));
	const unit = sensorUnit(
		sensors.find((s: any) => `${s.id}` === `${sensorId}`)
	);

	return (
		<View style={BoxFormStyle.boxForm}>
			<SwitchForm
				control={control}
				errors={errors}
				name="isEnabled"
				placeholder="Enable regulation"
			/>
			{isEnabled ? (
				<>
					<SelectForm
						lstData={sensorOptions}
						control={control}
						errors={errors}
						name="sensorId"
						placeholder="Feedback sensor*"
						rules={{required: 'Feedback sensor is required'}}
					/>
					<InputForm
						control={control}
						errors={errors}
						name="setpoint"
						placeholder={withUnit('Setpoint*', unit)}
						keyboardType="numeric"
						rules={{required: 'Setpoint is required'}}
					/>
					<SelectForm
						lstData={algorithmOptions}
						control={control}
						errors={errors}
						name="algorithm"
						placeholder="Algorithm"
					/>
					<InputForm
						control={control}
						errors={errors}
						name="params.kP"
						placeholder="kP (gain)"
						keyboardType="numeric"
					/>
					{algorithm !== ControlAlgorithm.P && (
						<>
							<InputForm
								control={control}
								errors={errors}
								name="params.kI"
								placeholder="kI (integral)"
								keyboardType="numeric"
							/>
							<InputForm
								control={control}
								errors={errors}
								name="params.kD"
								placeholder="kD (derivative)"
								keyboardType="numeric"
							/>
						</>
					)}
					<CollapsibleSection title="Advanced" icon={faGear}>
						<InputForm
							control={control}
							errors={errors}
							name="params.tolerance"
							placeholder={withUnit('Tolerance', unit)}
							keyboardType="numeric"
						/>
						<InputForm
							control={control}
							errors={errors}
							name="params.maxIterations"
							placeholder="Max iterations"
							keyboardType="numeric"
						/>
						<InputForm
							control={control}
							errors={errors}
							name="params.iterationDelayMs"
							placeholder="Iteration delay (ms)"
							keyboardType="numeric"
						/>
					</CollapsibleSection>
				</>
			) : (
				<Text style={styles.hint}>
					Regulation off: in a sequence, the value sent to this valve is
					its opening (%).
				</Text>
			)}
		</View>
	);
}

const styles = {
	hint: {
		color: '#8a96a3',
		fontSize: 13,
		marginTop: 8
	}
};

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, {updateControlLoop})(
	ActuatorRegulationSettingsSection
);
