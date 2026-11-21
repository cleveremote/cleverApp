// Configuration d'un variateur, portée par la box (`InverterModel`, collection
// `inverters`) : chaque paramètre (`parameters[]`) désigne un bloc de la
// register map du modèle (code Fgg.ii) et la valeur que la box maintient sur
// l'appareil (écrite en EEPROM seulement si elle diffère de la valeur lue).
// `value` est brute, dans l'unité de la saisie du `set` (ex. 5000 pour
// 50,00 Hz) : la saisie de la commande `set` (`params.value`) en donne la
// plage, l'échelle (`scale`), l'unité ou les choix (`entries`).
// Sans valeur, le paramètre est exposé mais pas imposé.

import i18n from 'i18next';
import {AnalogSignalType} from './analogTypes';

// Événement socket (relayé vers `box/synchronize/inverter`) et clé de la
// réponse renvoyée par le router.
export const SYNC_INVERTER_EVENT = 'front/box/sync/inverter';
export const INVERTER_RESPONSE_KEY = 'inverter';

export enum InverterMode {
	PID = 'PID',
	RS485 = 'RS485'
}

export type InverterParameter = {
	blockId: string;
	field: string;
	readCommandId: string;
	setCommandId: string;
	value?: number;
	isPersistent: boolean;
};

// Entrées analogiques pouvant porter le capteur de retour PID.
export enum InverterAnalogInput {
	AI1 = 'AI1',
	AI2 = 'AI2'
}
export const ANALOG_INPUTS = [InverterAnalogInput.AI1, InverterAnalogInput.AI2];

// Caractéristique du capteur branché sur une entrée (box :
// `InverterAnalogSensorModel`) : [inputMin, inputMax] (V ou mA) ↔
// [outputMin, outputMax] (unité physique). La box la reporte dans la courbe AI
// du variateur (tension basse / haute ↔ 0 % / 100 %) et s'en sert pour
// traduire une consigne capteur (`pidTarget`, ex. 3 bar) en consigne PID (%).
export type InverterAnalogSensor = {
	signalType: AnalogSignalType.VOLTAGE | AnalogSignalType.CURRENT;
	inputMin: number;
	inputMax: number;
	outputMin: number;
	outputMax: number;
	unit: string;
};

export type Inverter = {
	id: string;
	name: string;
	description?: string;
	deviceId: string;
	profile: string;
	parameters: InverterParameter[];
	analogInputs?: Partial<Record<InverterAnalogInput, InverterAnalogSensor>>;
	defaultMode: InverterMode;
	releaseGraceMs: number;
};

// Libellés en getters : lus dans la langue courante à chaque rendu.
export const inverterModeOptions = [
	{
		get label() {
			return i18n.t('devices:inverter.configuration.mode.PID');
		},
		value: InverterMode.PID
	},
	{
		get label() {
			return i18n.t('devices:inverter.configuration.mode.RS485');
		},
		value: InverterMode.RS485
	}
];

// Source du retour PID (F11.03 sur SI23) : présentée en tête des entrées
// analogiques pour basculer le capteur de retour entre AI1 et AI2.
export const PID_FEEDBACK_BLOCK = 'F11.03';
// Valeur de F11.03 par entrée analogique (2 = AI1, 3 = AI2) ; non imposée :
// valeur d'usine AI1.
const PID_SOURCE_INPUTS: Record<number, InverterAnalogInput> = {
	2: InverterAnalogInput.AI1,
	3: InverterAnalogInput.AI2
};
const PID_SOURCE_DEFAULT = 2;

// Valeur lue des entrées analogiques (champs du monitoring C00).
export const ANALOG_INPUT_FIELDS = [
	{field: 'c00_16', name: InverterAnalogInput.AI1},
	{field: 'c00_17', name: InverterAnalogInput.AI2}
];

// Courbe de chaque entrée (tension basse, % bas, tension haute, % haut) :
// imposée par la box d'après la caractéristique du capteur.
export const AI_CURVE_BLOCKS: Record<InverterAnalogInput, string[]> = {
	[InverterAnalogInput.AI1]: ['F03.00', 'F03.01', 'F03.02', 'F03.03'],
	[InverterAnalogInput.AI2]: ['F03.06', 'F03.07', 'F03.08', 'F03.09']
};
// Entrée en courant (cavalier mA) : 0..20 mA lus comme 0..10 V.
export const VOLTS_PER_MILLIAMP = 0.5;

export const curveInputOf = (blockId: string) =>
	ANALOG_INPUTS.find(input => AI_CURVE_BLOCKS[input].includes(blockId));

// Entrée analogique choisie comme retour PID (F11.03, ou valeur saisie
// `pidSource` quand le formulaire la change).
export const pidFeedbackInputOf = (
	inverter?: Pick<Inverter, 'parameters'>,
	pidSource?: number | null
): InverterAnalogInput | undefined => {
	const imposed = (inverter?.parameters ?? []).find(
		p => p.blockId === PID_FEEDBACK_BLOCK
	)?.value;
	return PID_SOURCE_INPUTS[pidSource ?? imposed ?? PID_SOURCE_DEFAULT];
};

// Capteur du retour PID ; undefined sans caractéristique pour la source.
export const pidFeedbackSensorOf = (
	inverter?: Pick<Inverter, 'parameters' | 'analogInputs'>
): InverterAnalogSensor | undefined => {
	const input = pidFeedbackInputOf(inverter);
	return input ? inverter?.analogInputs?.[input] : undefined;
};

const round = (value: number, decimals: number) =>
	Number(value.toFixed(decimals));

// Linéaire [fromMin, fromMax] → [toMin, toMax] ; plage dégénérée : undefined.
const scale = (
	value: number,
	fromMin: number,
	fromMax: number,
	toMin: number,
	toMax: number
) =>
	fromMax === fromMin
		? undefined
		: toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);

// Consigne capteur → consigne PID (%), bornée à 0..100 (comme la box).
export const targetToPercent = (
	sensor: InverterAnalogSensor,
	target: number
): number | undefined => {
	const percent = scale(
		target,
		Number(sensor.outputMin),
		Number(sensor.outputMax),
		0,
		100
	);
	return percent === undefined
		? undefined
		: round(Math.min(100, Math.max(0, percent)), 1);
};

// Valeur électrique lue (V ou mA) → grandeur physique du capteur.
export const readingToPhysical = (
	sensor: InverterAnalogSensor,
	reading: number
): number | undefined => {
	const value = scale(
		reading,
		Number(sensor.inputMin),
		Number(sensor.inputMax),
		Number(sensor.outputMin),
		Number(sensor.outputMax)
	);
	return value === undefined ? undefined : round(value, 2);
};

// Courbe reportée par la box (valeurs physiques V / %), pour l'affichage.
export const curveOf = (sensor: InverterAnalogSensor) => {
	const toVolts = (v: number) =>
		sensor.signalType === AnalogSignalType.CURRENT
			? Number(v) * VOLTS_PER_MILLIAMP
			: Number(v);
	return {
		lowVoltage: round(toVolts(sensor.inputMin), 2),
		highVoltage: round(toVolts(sensor.inputMax), 2)
	};
};

// Groupes d'affichage par groupe de paramètres (préfixe Fgg du bloc).
export type InverterParameterGroup = {key: string; blockIds: string[]};
const GROUPS = ['F00', 'F01', 'F02', 'F03', 'F11', 'F12', 'F13'];
export const ANALOG_GROUP = 'F03';
export const OTHER_GROUP = 'other';

export const groupOf = (blockId: string) => {
	if (blockId === PID_FEEDBACK_BLOCK) return ANALOG_GROUP;
	const prefix = blockId.split('.')[0];
	return GROUPS.includes(prefix) ? prefix : OTHER_GROUP;
};

const byBlock = (a: string, b: string) => {
	if (a === PID_FEEDBACK_BLOCK) return -1;
	if (b === PID_FEEDBACK_BLOCK) return 1;
	return a.localeCompare(b);
};

// Groupes non vides, dans l'ordre des groupes du variateur puis « autres ».
export const groupParameters = (
	parameters: InverterParameter[]
): InverterParameterGroup[] =>
	[...GROUPS, OTHER_GROUP]
		.map(key => ({
			key,
			blockIds: parameters
				.map(p => p.blockId)
				.filter(blockId => groupOf(blockId) === key)
				.sort(byBlock)
		}))
		.filter(group => group.blockIds.length > 0);

// Nombre de décimales d'une échelle (0.01 → 2, 0.1 → 1, 1 → 0).
export const scaleDecimals = (scale?: number) =>
	scale && scale < 1 ? Math.round(-Math.log10(scale)) : 0;

// Valeur brute → valeur affichée (unité physique).
export const toDisplay = (raw: any, scale?: number): string => {
	if (raw === undefined || raw === null || raw === '') return '';
	const value = Number(raw) * (scale ?? 1);
	return `${Number(value.toFixed(scaleDecimals(scale)))}`;
};

// Valeur saisie (unité physique, virgule acceptée) → valeur brute ; vide :
// `null` (paramètre plus imposé) ; non numérique : NaN.
export const toRaw = (input: any, scale?: number): number | null => {
	if (input === undefined || input === null || `${input}`.trim() === '') {
		return null;
	}
	const value = Number(`${input}`.replace(',', '.'));
	return Number.isNaN(value) ? NaN : Math.round(value / (scale ?? 1));
};
