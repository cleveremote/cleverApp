// Sensor ANALOG : lecture COM (parent ou enfant, comme un sensor COM) convertie
// en grandeur physique par une mise à l'échelle linéaire (`config.scaling`) :
// [inputMin, inputMax] (unité électrique selon signalType) -> [outputMin,
// outputMax] (unité physique). Plages inversées admises (ex : 4-20 mA ->
// 10-0 bar), mais inputMin !== inputMax.

import i18n from 'i18next';

export enum AnalogSignalType {
	// Bornes en V.
	VOLTAGE = 'VOLTAGE',
	// Bornes en mA.
	CURRENT = 'CURRENT',
	// Bornes dans l'unité brute lue (ex : code ADC 0-4095), sans conversion.
	RAW = 'RAW'
}

// Comportement quand la valeur lue sort de [inputMin, inputMax].
export enum OutOfRangePolicy {
	CLAMP = 'CLAMP',
	EXTRAPOLATE = 'EXTRAPOLATE',
	ERROR = 'ERROR'
}

export interface AnalogScaling {
	signalType: AnalogSignalType | `${AnalogSignalType}`;
	inputMin: number;
	inputMax: number;
	outputMin: number;
	outputMax: number;
	// Unité physique de la valeur convertie (bar, °C, %, m³/h…).
	unit: string;
	outOfRange: OutOfRangePolicy | `${OutOfRangePolicy}`;
}

// Libellés en getters : lus dans la langue courante à chaque rendu.
const option = <T extends string>(prefix: string, value: T) => ({
	get label() {
		return i18n.t(`${prefix}.${value}` as never) as string;
	},
	value
});

export const signalTypeOptions = [
	option('sensor:analog.signal', AnalogSignalType.VOLTAGE),
	option('sensor:analog.signal', AnalogSignalType.CURRENT),
	option('sensor:analog.signal', AnalogSignalType.RAW)
];

export const outOfRangeOptions = [
	option('sensor:analog.outOfRange', OutOfRangePolicy.CLAMP),
	option('sensor:analog.outOfRange', OutOfRangePolicy.EXTRAPOLATE),
	option('sensor:analog.outOfRange', OutOfRangePolicy.ERROR)
];

// Unité des bornes d'entrée selon le type de signal (aucune en RAW).
export const signalUnit = (signalType?: string): string | undefined => {
	if (signalType === AnalogSignalType.VOLTAGE) return 'V';
	if (signalType === AnalogSignalType.CURRENT) return 'mA';
	return undefined;
};

export const SCALING_NUMBER_FIELDS = [
	'inputMin',
	'inputMax',
	'outputMin',
	'outputMax'
] as const;

export const emptyScaling = (): Partial<AnalogScaling> => ({
	signalType: AnalogSignalType.VOLTAGE,
	outOfRange: OutOfRangePolicy.CLAMP
});

const isNumber = (v: any) =>
	v !== undefined && v !== null && v !== '' && !Number.isNaN(Number(v));

// Échelle complète et exploitable par la box.
export const isScalingValid = (scaling?: Partial<AnalogScaling>) =>
	!!scaling?.signalType &&
	!!scaling?.outOfRange &&
	!!scaling?.unit &&
	SCALING_NUMBER_FIELDS.every(f => isNumber(scaling[f])) &&
	Number(scaling.inputMin) !== Number(scaling.inputMax);
