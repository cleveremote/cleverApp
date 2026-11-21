import React from 'react';
import i18n from 'i18next';
import {StyleSheet, Text, View} from 'react-native';
import {
	InputForm,
	SelectForm
} from '../../../../components/common/FormComponents';
import {fieldLabelColor} from '../../../../styles/components/common/Input';
import {
	AnalogSignalType,
	SCALING_NUMBER_FIELDS,
	signalTypeOptions,
	signalUnit
} from '../../../../data/analogTypes';
import {
	InverterAnalogInput,
	InverterAnalogSensor,
	curveOf
} from '../../../../data/inverterTypes';

// Choix « aucun capteur » : caractéristique supprimée (envoyée à null).
export const NO_SENSOR = '';

const withUnit = (label: string, unit?: string) =>
	unit ? `${label} (${unit})` : label;

const isNumber = (v: any) =>
	v !== undefined &&
	v !== null &&
	`${v}`.trim() !== '' &&
	!Number.isNaN(Number(`${v}`.replace(',', '.')));

const toNumber = (v: any) => Number(`${v}`.replace(',', '.'));

// Valeurs du formulaire d'une entrée (chaînes) → caractéristique ; `null` :
// aucun capteur ; incomplète : undefined (bloquée par la validation).
export const toAnalogSensor = (
	values: any
): InverterAnalogSensor | null | undefined => {
	if (!values?.signalType || values.signalType === NO_SENSOR) return null;
	if (!SCALING_NUMBER_FIELDS.every(f => isNumber(values[f]))) return undefined;
	if (!`${values.unit ?? ''}`.trim()) return undefined;
	return {
		signalType: values.signalType,
		inputMin: toNumber(values.inputMin),
		inputMax: toNumber(values.inputMax),
		outputMin: toNumber(values.outputMin),
		outputMax: toNumber(values.outputMax),
		unit: `${values.unit}`.trim()
	};
};

// Caractéristique enregistrée → valeurs du formulaire.
export const analogSensorFormValues = (sensor?: InverterAnalogSensor) =>
	sensor
		? {
				signalType: sensor.signalType,
				unit: sensor.unit,
				inputMin: `${sensor.inputMin}`,
				inputMax: `${sensor.inputMax}`,
				outputMin: `${sensor.outputMin}`,
				outputMax: `${sensor.outputMax}`
		  }
		: {signalType: NO_SENSOR};

// Tension (ou courant) d'entrée de 0 à 10 V (0 à 20 mA) : plage d'une AI.
const inputRange = (signalType?: string) =>
	signalType === AnalogSignalType.CURRENT ? 20 : 10;

const requiredNumber = (label: string, signalType?: string) => ({
	validate: (v: any) => {
		if (!isNumber(v)) {
			return `${v ?? ''}`.trim() === ''
				? i18n.t('sensor:analog.fieldRequired', {field: label})
				: i18n.t('sensor:analog.mustBeNumber');
		}
		if (signalType === undefined) return true;
		const max = inputRange(signalType);
		const n = toNumber(v);
		return (
			(n >= 0 && n <= max) ||
			i18n.t('devices:inverter.sensor.inputOutOfRange', {
				max,
				unit: signalUnit(signalType)
			})
		);
	}
});

// Caractéristique du capteur branché sur une entrée analogique du variateur,
// même saisie que la section « Scaling » d'un sensor ANALOG (type de signal,
// unité, bornes d'entrée ↔ bornes de sortie). Champs du formulaire de
// configuration du variateur, sous `analogInputs.<AIx>`.
export function InverterAnalogSensorSection({
	input,
	control,
	errors,
	watch,
	getValues
}: Readonly<{
	input: InverterAnalogInput;
	control: any;
	errors: any;
	watch: (name: string) => any;
	getValues: (name: string) => any;
}>) {
	const name = `analogInputs.${input}`;
	const signalType = watch(`${name}.signalType`);
	const hasSensor = !!signalType && signalType !== NO_SENSOR;
	const inputUnit = signalUnit(signalType);
	const outputUnit = watch(`${name}.unit`);
	const sensor = hasSensor ? toAnalogSensor(watch(name)) : undefined;
	const curve = sensor ? curveOf(sensor) : undefined;
	const signalOptions = [
		{label: i18n.t('devices:inverter.sensor.none'), value: NO_SENSOR},
		...signalTypeOptions.filter(o => o.value !== AnalogSignalType.RAW)
	];

	return (
		<View style={styles.box}>
			<Text style={styles.title}>
				{i18n.t('devices:inverter.sensor.title', {input})}
			</Text>
			<SelectForm
				lstData={signalOptions}
				control={control}
				errors={errors}
				name={`${name}.signalType`}
				placeholder={i18n.t('sensor:analog.signalType')}
			/>
			{hasSensor ? (
				<>
					<InputForm
						control={control}
						errors={errors}
						name={`${name}.unit`}
						placeholder={i18n.t('sensor:analog.unit')}
						rules={{
							validate: (v: any) =>
								`${v ?? ''}`.trim() !== '' ||
								i18n.t('sensor:analog.unitRequired')
						}}
					/>
					<View style={styles.row}>
						<View style={styles.col}>
							<InputForm
								control={control}
								errors={errors}
								name={`${name}.inputMin`}
								placeholder={withUnit(
									`${i18n.t('sensor:analog.inputMin')}*`,
									inputUnit
								)}
								keyboardType="numeric"
								rules={requiredNumber(
									i18n.t('sensor:analog.inputMin'),
									signalType
								)}
							/>
						</View>
						<View style={styles.col}>
							<InputForm
								control={control}
								errors={errors}
								name={`${name}.outputMin`}
								placeholder={withUnit(
									`${i18n.t('sensor:analog.outputMin')}*`,
									outputUnit
								)}
								keyboardType="numeric"
								rules={requiredNumber(i18n.t('sensor:analog.outputMin'))}
							/>
						</View>
					</View>
					<View style={styles.row}>
						<View style={styles.col}>
							<InputForm
								control={control}
								errors={errors}
								name={`${name}.inputMax`}
								placeholder={withUnit(
									`${i18n.t('sensor:analog.inputMax')}*`,
									inputUnit
								)}
								keyboardType="numeric"
								rules={{
									validate: (v: any) => {
										const base = requiredNumber(
											i18n.t('sensor:analog.inputMax'),
											signalType
										).validate(v);
										if (base !== true) return base;
										return (
											toNumber(v) !==
												toNumber(getValues(`${name}.inputMin`)) ||
											i18n.t('sensor:analog.inputMaxDiffers')
										);
									}
								}}
							/>
						</View>
						<View style={styles.col}>
							<InputForm
								control={control}
								errors={errors}
								name={`${name}.outputMax`}
								placeholder={withUnit(
									`${i18n.t('sensor:analog.outputMax')}*`,
									outputUnit
								)}
								keyboardType="numeric"
								rules={requiredNumber(i18n.t('sensor:analog.outputMax'))}
							/>
						</View>
					</View>
					{curve ? (
						<Text style={styles.hint}>
							{i18n.t('devices:inverter.sensor.curve', {
								low: curve.lowVoltage,
								high: curve.highVoltage
							})}
						</Text>
					) : null}
				</>
			) : (
				<Text style={styles.hint}>
					{i18n.t('devices:inverter.sensor.noneHint')}
				</Text>
			)}
		</View>
	);
}

const COLORS = {
	text: '#32404e',
	border: '#CBD5E0'
};

const styles = StyleSheet.create({
	box: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		padding: 10,
		marginBottom: 10
	},
	title: {color: COLORS.text, fontWeight: 'bold', marginBottom: 4},
	row: {flexDirection: 'row', gap: 10},
	col: {flex: 1},
	hint: {color: fieldLabelColor, fontSize: 12, marginTop: 6}
});
