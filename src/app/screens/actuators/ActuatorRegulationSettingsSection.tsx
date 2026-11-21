import React, {useRef} from 'react';
import i18n from 'i18next';
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
	ControlLoopMode,
	algorithmOptions,
	emptyControlLoop,
	emptyControlParams,
	emptyFollowParams,
	modeOptions,
	sensorUnit
} from '../../data/controlLoopTypes';
import {toNumber} from '../devices/deviceFieldUtils';

const PARAM_FIELDS = Object.keys(emptyControlParams());
const FOLLOW_FIELDS = Object.keys(emptyFollowParams());

const withUnit = (label: string, unit?: string) =>
	unit ? `${label} (${unit})` : label;

// Section « Regulation » des réglages d'une vanne CTRL : la ControlLoop de la
// vanne (capteur de retour, consigne, algorithme, gains), ou en mode FOLLOW le
// suivi d'un potentiomètre (plage d'entrée, deadband). Embarquée dans
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
			mode: base.mode ?? ControlLoopMode.REGULATION,
			params: {...emptyControlParams(), ...base.params},
			follow: {...emptyFollowParams(), ...base.follow}
		},
		mode: 'onChange'
	});

	// Les saisies sont des chaînes : on recoerce les nombres avant de stager.
	// En FOLLOW, la boucle part sans consigne, algorithme ni gains : seule la
	// période de lecture est gardée dans `params`.
	const toLoop = (values: any) => {
		const common = {
			...base,
			...values,
			name: base.name ?? actuator?.name,
			actuatorId: actuator?.id,
			isModified: true
		};
		if (values.mode === ControlLoopMode.FOLLOW) {
			const {setpoint, algorithm, ...loop} = common;
			const follow: Record<string, any> = {};
			FOLLOW_FIELDS.forEach(field => {
				follow[field] = toNumber(values.follow?.[field]);
			});
			return {
				...loop,
				follow,
				params: {
					iterationDelayMs: toNumber(values.params?.iterationDelayMs)
				}
			};
		}
		const params: Record<string, any> = {...values.params};
		PARAM_FIELDS.forEach(field => {
			params[field] = toNumber(params[field]);
		});
		const {follow, ...loop} = common;
		return {
			...loop,
			setpoint: toNumber(values.setpoint),
			params
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
	const isFollow = watch('mode') === ControlLoopMode.FOLLOW;
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
				placeholder={i18n.t('actuators:regulation.enable')}
			/>
			{isEnabled && isFollow ? (
				<>
					<SelectForm
						lstData={modeOptions}
						control={control}
						errors={errors}
						name="mode"
						placeholder={i18n.t('actuators:regulation.mode')}
					/>
					<SelectForm
						lstData={sensorOptions}
						control={control}
						errors={errors}
						name="sensorId"
						placeholder={i18n.t('actuators:regulation.analogInput')}
						rules={{required: i18n.t('actuators:regulation.analogInputRequired')}}
					/>
					<InputForm
						control={control}
						errors={errors}
						name="follow.inputMin"
						placeholder={withUnit(i18n.t('sensor:analog.inputMin'), unit)}
						keyboardType="numeric"
					/>
					<InputForm
						control={control}
						errors={errors}
						name="follow.inputMax"
						placeholder={withUnit(i18n.t('sensor:analog.inputMax'), unit)}
						keyboardType="numeric"
					/>
					<InputForm
						control={control}
						errors={errors}
						name="follow.deadband"
						placeholder={i18n.t('actuators:regulation.deadband')}
						keyboardType="numeric"
					/>
					<InputForm
						control={control}
						errors={errors}
						name="params.iterationDelayMs"
						placeholder={i18n.t('actuators:regulation.readPeriod')}
						keyboardType="numeric"
					/>
				</>
			) : isEnabled ? (
				<>
					<SelectForm
						lstData={modeOptions}
						control={control}
						errors={errors}
						name="mode"
						placeholder={i18n.t('actuators:regulation.mode')}
					/>
					<SelectForm
						lstData={sensorOptions}
						control={control}
						errors={errors}
						name="sensorId"
						placeholder={i18n.t('actuators:regulation.feedbackSensor')}
						rules={{required: i18n.t('actuators:regulation.feedbackSensorRequired')}}
					/>
					<InputForm
						control={control}
						errors={errors}
						name="setpoint"
						placeholder={withUnit(i18n.t('actuators:regulation.setpoint'), unit)}
						keyboardType="numeric"
						rules={{required: i18n.t('actuators:regulation.setpointRequired')}}
					/>
					<SelectForm
						lstData={algorithmOptions}
						control={control}
						errors={errors}
						name="algorithm"
						placeholder={i18n.t('actuators:regulation.algorithm')}
					/>
					<InputForm
						control={control}
						errors={errors}
						name="params.kP"
						placeholder={i18n.t('actuators:regulation.kP')}
						keyboardType="numeric"
					/>
					{algorithm !== ControlAlgorithm.P && (
						<>
							<InputForm
								control={control}
								errors={errors}
								name="params.kI"
								placeholder={i18n.t('actuators:regulation.kI')}
								keyboardType="numeric"
							/>
							<InputForm
								control={control}
								errors={errors}
								name="params.kD"
								placeholder={i18n.t('actuators:regulation.kD')}
								keyboardType="numeric"
							/>
						</>
					)}
					<CollapsibleSection title={i18n.t('actuators:regulation.advanced')} icon={faGear}>
						<InputForm
							control={control}
							errors={errors}
							name="params.tolerance"
							placeholder={withUnit(i18n.t('actuators:regulation.tolerance'), unit)}
							keyboardType="numeric"
						/>
						<InputForm
							control={control}
							errors={errors}
							name="params.maxIterations"
							placeholder={i18n.t('actuators:regulation.maxIterations')}
							keyboardType="numeric"
						/>
						<InputForm
							control={control}
							errors={errors}
							name="params.iterationDelayMs"
							placeholder={i18n.t('actuators:regulation.iterationDelay')}
							keyboardType="numeric"
						/>
					</CollapsibleSection>
				</>
			) : (
				<Text style={styles.hint}>
					{i18n.t('actuators:regulation.offHint')}
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
