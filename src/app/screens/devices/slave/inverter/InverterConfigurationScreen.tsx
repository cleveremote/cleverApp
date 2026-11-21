import React, {useMemo, useRef} from 'react';
import i18n from 'i18next';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import {faBolt, faGear, faWaveSquare} from '@fortawesome/free-solid-svg-icons';
import {
	InputForm,
	SelectForm
} from '../../../../components/common/FormComponents';
import {CollapsibleSection} from '../../../../components/common/CollapsibleSection';
import {useSectionSettingsHeader} from '../../../../components/common/useSectionSettingsHeader';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {fieldLabelColor} from '../../../../styles/components/common/Input';
import {saveInverter} from '../../../../../module/process/infrasctructure/store/actions/inverter';
import {
	ANALOG_GROUP,
	ANALOG_INPUTS,
	ANALOG_INPUT_FIELDS,
	InverterAnalogInput,
	InverterAnalogSensor,
	InverterMode,
	InverterParameter,
	PID_FEEDBACK_BLOCK,
	curveInputOf,
	groupParameters,
	inverterModeOptions,
	readingToPhysical,
	toDisplay,
	toRaw
} from '../../../../data/inverterTypes';
import {
	InverterAnalogSensorSection,
	NO_SENSOR,
	analogSensorFormValues,
	toAnalogSensor
} from './InverterAnalogSensorSection';

// Clé de formulaire d'un bloc : react-hook-form lit les « . » comme des
// niveaux d'objet (F03.00 → F03_00).
const formKey = (blockId: string) => `params.${blockId.replace(/\./g, '_')}`;
const formValue = (values: any, blockId: string) =>
	values?.params?.[blockId.replace(/\./g, '_')];

// Délai de relâche saisi en secondes, envoyé en ms (au plus 10 min).
const RELEASE_GRACE_SPEC = {min: 0, max: 600000, scale: 0.001};

// Choix vide d'un enum : paramètre non imposé.
const NOT_IMPOSED = '';

const findCommand = (model: any, commandId: any) =>
	(model?.deviceCommands ?? []).find(
		(c: any) => `${c.id}` === `${commandId}`
	);

// Description d'un paramètre pour le formulaire : libellé du champ lu
// (« AI1 : tension basse »), saisie du `set` (plage, échelle, unité, choix).
type ParameterUi = {
	parameter: InverterParameter;
	label: string;
	spec: any;
};

const describeParameter = (
	model: any,
	parameter: InverterParameter
): ParameterUi => {
	const read = findCommand(model, parameter.readCommandId);
	const set = findCommand(model, parameter.setCommandId);
	const field = (read?.params?.result?.fields ?? []).find(
		(f: any) => f.name === parameter.field
	);
	const name = field?.label ?? set?.name ?? parameter.field;
	return {
		parameter,
		label: `${parameter.blockId} · ${name}`,
		spec: set?.params?.value
	};
};

const isEnumSpec = (spec: any) =>
	spec?.type === 'enum' && Array.isArray(spec.entries);

const initialValue = ({parameter, spec}: ParameterUi) =>
	isEnumSpec(spec)
		? parameter.value === undefined || parameter.value === null
			? NOT_IMPOSED
			: `${parameter.value}`
		: toDisplay(parameter.value, spec?.scale);

// Valeur à envoyer : brute, `null` si vide (paramètre plus imposé).
const submittedValue = ({spec}: ParameterUi, input: any): number | null =>
	isEnumSpec(spec)
		? input === NOT_IMPOSED || input === undefined || input === null
			? null
			: Number(input)
		: toRaw(input, spec?.scale);

const withUnit = (label: string, unit?: string) =>
	unit ? `${label} (${unit})` : label;

// Contrôle d'une saisie numérique : plage de la saisie du `set`, affichée dans
// l'unité physique.
const numberRules = (spec: any) => ({
	validate: (input: any) => {
		const raw = toRaw(input, spec?.scale);
		if (raw === null) return true;
		if (Number.isNaN(raw)) {
			return i18n.t('devices:inverter.configuration.invalidNumber');
		}
		if (
			spec?.min != null &&
			spec?.max != null &&
			(raw < spec.min || raw > spec.max)
		) {
			return i18n.t('devices:inverter.configuration.outOfRange', {
				min: toDisplay(spec.min, spec.scale),
				max: toDisplay(spec.max, spec.scale),
				unit: spec.unit ?? ''
			});
		}
		return true;
	}
});

function ParameterField({
	ui,
	control,
	errors
}: Readonly<{ui: ParameterUi; control: any; errors: any}>) {
	const {parameter, label, spec} = ui;
	if (isEnumSpec(spec)) {
		const options = [
			{
				label: i18n.t('devices:inverter.configuration.notImposed'),
				value: NOT_IMPOSED
			},
			...spec.entries.map((e: any) => ({
				label: `${e.value} · ${e.label}`,
				value: `${e.value}`
			}))
		];
		return (
			<SelectForm
				lstData={options}
				control={control}
				errors={errors}
				name={formKey(parameter.blockId)}
				placeholder={label}
			/>
		);
	}
	return (
		<InputForm
			control={control}
			errors={errors}
			name={formKey(parameter.blockId)}
			placeholder={withUnit(label, spec?.unit)}
			keyboardType="numeric"
			rules={numberRules(spec)}
		/>
	);
}

// Valeur lue des entrées analogiques du variateur (sensors du monitoring),
// suivie de la grandeur du capteur quand sa caractéristique est enregistrée
// (« AI1 : 1.7 V ≈ 3 bar »).
function AnalogInputsReading({
	sensors,
	deviceId,
	analogInputs
}: Readonly<{
	sensors: any[];
	deviceId: any;
	analogInputs?: Partial<Record<InverterAnalogInput, InverterAnalogSensor>>;
}>) {
	const readings = ANALOG_INPUT_FIELDS.map(({field, name}) => {
		const sensor = (sensors ?? []).find(
			(s: any) =>
				`${s.config?.deviceId}` === `${deviceId}` &&
				s.config?.field === field
		);
		if (sensor?.value == null) return undefined;
		const characteristic = analogInputs?.[name];
		const physical =
			characteristic && !Number.isNaN(Number(sensor.value))
				? readingToPhysical(characteristic, Number(sensor.value))
				: undefined;
		return `${name} : ${sensor.value}${
			sensor.unit ? ` ${sensor.unit}` : ''
		}${
			physical === undefined ? '' : ` ≈ ${physical} ${characteristic?.unit}`
		}`;
	}).filter(Boolean);
	if (readings.length === 0) return null;
	return (
		<Text style={styles.hint}>
			{`${i18n.t(
				'devices:inverter.configuration.analogReading'
			)} ${readings.join(' · ')}`}
		</Text>
	);
}

// Configuration d'un variateur (Slave device → Variateur → Configuration) :
// mode par défaut, délai de relâche et valeur imposée de chacun de ses
// paramètres, groupés par groupe Fgg (les entrées analogiques AI1 / AI2
// commencent par la source du retour PID). Champ vide : paramètre non imposé.
// La sauvegarde passe par la box, qui réécrit sur l'appareil les seuls
// paramètres qui diffèrent.
export function InverterConfigurationScreen(props: any) {
	const {inverterId} = props.route?.params ?? {};
	const inverter = (props.inverters ?? []).find(
		(i: any) => `${i.id}` === `${inverterId}`
	);
	const inverterRef = useRef(inverter);
	const model = (props.models ?? []).find(
		(m: any) => `${m.id}` === `${props.route?.params?.modelId}`
	);

	const parameters: ParameterUi[] = useMemo(
		() =>
			(inverterRef.current?.parameters ?? []).map(
				(p: InverterParameter) => describeParameter(model, p)
			),
		[model]
	);
	const byBlock = useMemo(
		() => new Map(parameters.map(ui => [ui.parameter.blockId, ui])),
		[parameters]
	);
	const groups = useMemo(
		() => groupParameters(parameters.map(ui => ui.parameter)),
		[parameters]
	);

	const {
		control,
		getValues,
		watch,
		formState: {errors, isDirty}
	} = useForm<any>({
		defaultValues: {
			defaultMode: inverterRef.current?.defaultMode ?? InverterMode.PID,
			releaseGraceS: toDisplay(
				inverterRef.current?.releaseGraceMs,
				RELEASE_GRACE_SPEC.scale
			),
			analogInputs: Object.fromEntries(
				ANALOG_INPUTS.map(input => [
					input,
					analogSensorFormValues(inverterRef.current?.analogInputs?.[input])
				])
			),
			params: Object.fromEntries(
				parameters.map(ui => [
					ui.parameter.blockId.replace(/\./g, '_'),
					initialValue(ui)
				])
			)
		},
		mode: 'onChange'
	});

	useSectionSettingsHeader({
		navigation: props.navigation,
		entity: isDirty,
		isNew: false,
		hasChanges: () => isDirty,
		validate: () => ({form: Object.keys(errors ?? {}).length > 0}),
		save: onDone => {
			const values = getValues();
			// entrée avec capteur : sa courbe F03 est calculée par la box
			const analogInputs = Object.fromEntries(
				ANALOG_INPUTS.map(input => [
					input,
					toAnalogSensor(values.analogInputs?.[input])
				]).filter(([, sensor]) => sensor !== undefined)
			);
			const isCurveImposed = (blockId: string) => {
				const input = curveInputOf(blockId);
				return !!input && !!analogInputs[input];
			};
			const releaseGraceMs = toRaw(
				values.releaseGraceS,
				RELEASE_GRACE_SPEC.scale
			);
			props.saveInverter(inverterRef.current, {
				defaultMode: values.defaultMode,
				...(releaseGraceMs !== null &&
					!Number.isNaN(releaseGraceMs) && {releaseGraceMs}),
				analogInputs,
				parameters: parameters
					.filter(ui => !isCurveImposed(ui.parameter.blockId))
					.map(ui => ({
						blockId: ui.parameter.blockId,
						value: submittedValue(
							ui,
							formValue(values, ui.parameter.blockId)
						)
					}))
			});
			onDone();
		},
		backWhenPristine: true
	});

	if (!inverterRef.current) {
		return (
			<View style={BoxFormStyle.boxForm}>
				<Text style={styles.hint}>
					{i18n.t('devices:inverter.none')}
				</Text>
			</View>
		);
	}

	return (
		<ScrollView automaticallyAdjustKeyboardInsets>
			<View style={BoxFormStyle.boxForm}>
				<Text style={styles.title}>{inverterRef.current.name}</Text>
				<SelectForm
					lstData={inverterModeOptions}
					control={control}
					errors={errors}
					name="defaultMode"
					placeholder={i18n.t('devices:inverter.defaultMode')}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="releaseGraceS"
					placeholder={withUnit(
						i18n.t('devices:inverter.releaseGrace'),
						's'
					)}
					keyboardType="numeric"
					rules={numberRules(RELEASE_GRACE_SPEC)}
				/>
				<Text style={styles.hint}>
					{i18n.t('devices:inverter.configuration.hint')}
				</Text>
				{!model ? (
					<Text style={styles.hint}>
						{i18n.t('devices:inverter.unknownCommand')}
					</Text>
				) : null}
				{groups.map(group => (
					<CollapsibleSection
						key={group.key}
						title={i18n.t(
							`devices:inverter.configuration.groups.${group.key}` as any
						)}
						icon={
							group.key === ANALOG_GROUP
								? faWaveSquare
								: group.key === 'F00'
								? faBolt
								: faGear
						}
						initiallyExpanded={group.key === ANALOG_GROUP}>
						{group.key === ANALOG_GROUP ? (
							<>
								<AnalogInputsReading
									sensors={props.sensors}
									deviceId={inverterRef.current.deviceId}
									analogInputs={inverterRef.current.analogInputs}
								/>
								{ANALOG_INPUTS.map(input => (
									<InverterAnalogSensorSection
										key={input}
										input={input}
										control={control}
										errors={errors}
										watch={watch}
										getValues={getValues}
									/>
								))}
							</>
						) : null}
						{group.blockIds.map(blockId => {
							const ui = byBlock.get(blockId);
							if (!ui) return null;
							// courbe calculée depuis le capteur : pas de saisie directe
							const curveInput = curveInputOf(blockId);
							const curveSensorType =
								curveInput &&
								watch(`analogInputs.${curveInput}.signalType`);
							if (curveSensorType && curveSensorType !== NO_SENSOR) {
								return null;
							}
							return (
								<View
									key={blockId}
									style={
										blockId === PID_FEEDBACK_BLOCK
											? styles.highlight
											: undefined
									}>
									<ParameterField
										ui={ui}
										control={control}
										errors={errors}
									/>
								</View>
							);
						})}
					</CollapsibleSection>
				))}
			</View>
		</ScrollView>
	);
}

const COLORS = {
	text: '#32404e',
	// Repère de la source du retour PID (bascule AI1 / AI2).
	accent: '#3b82f6'
};

const styles = StyleSheet.create({
	title: {
		color: COLORS.text,
		fontWeight: 'bold',
		fontSize: 16,
		marginBottom: 4
	},
	hint: {color: fieldLabelColor, fontSize: 13, marginVertical: 6},
	highlight: {
		borderLeftWidth: 3,
		borderLeftColor: COLORS.accent,
		paddingLeft: 8,
		marginBottom: 8
	}
});

const mapStateToProps = (state: any) => ({
	inverters: state.root_inverter.inverters,
	models: state.root_device_model.models,
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, {saveInverter})(
	InverterConfigurationScreen
);
