import { StackNavigationProp } from '@react-navigation/stack';
import { OrientationType } from 'react-native-orientation-locker';
export const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};
export type CyclesStackParamList = {
	Cycles: undefined;
	Settings: undefined;
	SequenceSettings: undefined;
	Schedule: undefined;
	Triggers: undefined;
};

export type navigationCycleType = StackNavigationProp<
	CyclesStackParamList,
	'Cycles'
>;

export interface ICyclesProps {
	navigation: navigationCycleType;
}

export type CycleType = {
	id: string;
	sequences: SequenceItem[];
	isModified?: boolean;
};

export type SequenceItem = {
	key: string;
	id: string;
	name: string;
	description: string;
	duration: number;
	modules: ModuleItem[];
	isModified?: boolean;
};

export type ModuleItem = {
	key: number;
	id: string;
	portNum: number;
};

export type MyProps = {
	executeCycle: Function;
	loadConfiguration: Function;
	listenerEvents: Function;
	executeCycleSync: Function;
	loadCycle: Function;
	saveCycle: Function;
	process: any;
	navigation: any;
	route: any;
	////
	configuration: any;
	sequence: any;
};

export type Item = {
	key: string;
	priority: number;
	mode: string;
};

export const options = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

export type MyState = {
	configuration: string;
	refreshing: boolean;
	orientation: OrientationType;
	sequencesData: any[];
	formData: any;
	isOpen: boolean;
	enableScroll: boolean;
	//////:

	cycleFormData: any;
	saveUnchangedData: boolean;
	activeMenu?: string;
};

export const PriorityModes = [
	{ index: 0, label: 'Manual' },
	{ index: 1, label: 'Schedule' },
	{ index: 2, label: 'Trigger' }
];
export const Priorities = PriorityModes.map(d => {
	const backgroundColor = 'white';
	return {
		index: d.index,
		id: `item-${d.index}`,
		key: `item-${d.index}`,
		label: d.label,
		backgroundColor
	};
});

const clamp = (v: number, min: number, max: number) =>
	Math.max(min, Math.min(max, v));

function rgbToHsl(r: number, g: number, b: number) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	let h = 0;
	let s = 0;
	if (d !== 0) {
		s = d / (1 - Math.abs(2 * l - 1));
		if (max === r) {
			h = ((g - b) / d) % 6;
		} else if (max === g) {
			h = (b - r) / d + 2;
		} else {
			h = (r - g) / d + 4;
		}
		h *= 60;
		if (h < 0) {
			h += 360;
		}
	}
	return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r = 0;
	let g = 0;
	let b = 0;
	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}
	const channel = (value: number) =>
		clamp(Math.round((value + m) * 255), 0, 255)
			.toString(16)
			.padStart(2, '0');
	return `#${channel(r)}${channel(g)}${channel(b)}`;
}

// Transforme une couleur pastel vers sa version vive en gardant la teinte :
// proportion = 0 -> couleur d'origine, proportion = 1 -> saturation max & luminosité 50%
// ex: vivify('#fed7aa', 1) ≈ '#ff9800'
function vivify(hex: string, proportion: number, darken = 0) {
	const amount = clamp(proportion, 0, 1);
	const value = hex.replace('#', '');
	const { h, s, l } = rgbToHsl(
		parseInt(value.slice(0, 2), 16),
		parseInt(value.slice(2, 4), 16),
		parseInt(value.slice(4, 6), 16)
	);
	const targetL = clamp(l + (0.5 - l) * amount - darken, 0, 1);
	return hslToHex(h, s + (1 - s) * amount, targetL);
}

export function getColors(proportion = 0) {
	const colors = [
		{
			fontColor: '#ec4899',
			iconColor: { icon: '#f472b6', base: '#f472b6' },
			bgColor: '#fbcfe8'
		},
		{
			fontColor: '#d946ef',
			iconColor: { icon: '#e879f9', base: '#e879f9' },
			bgColor: '#f0abfc'
		},
		{
			fontColor: '#64748b',
			iconColor: { icon: '#94a3b8', base: '#94a3b8' },
			bgColor: '#cbd5e1'
		},
		{
			fontColor: '#6366f1',
			iconColor: { icon: '#818cf8', base: '#818cf8' },
			bgColor: '#c7d2fe'
		},
		{
			fontColor: '#3b82f6',
			iconColor: { icon: '#60a5fa', base: '#60a5fa' },
			bgColor: '#bfdbfe'
		},
		{
			fontColor: '#0ea5e9',
			iconColor: { icon: '#41bdf8', base: '#41bdf8' },
			bgColor: '#bae6fd'
		},
		{
			fontColor: '#06b6d4',
			iconColor: { icon: '#47d3ee', base: '#47d3ee' },
			bgColor: '#a5f3fc'
		},
		{
			fontColor: '#14b8a6',
			iconColor: { icon: '#46d4bf', base: '#46d4bf' },
			bgColor: '#99f6e4'
		},
		{
			fontColor: '#10b981',
			iconColor: { icon: '#44d399', base: '#44d399' },
			bgColor: '#a7f3d0'
		},
		{
			fontColor: '#22c55e',
			iconColor: { icon: '#4ade80', base: '#4ade80' },
			bgColor: '#bbf7d0'
		},
		{
			fontColor: '#84cc16',
			iconColor: { icon: '#a3e635', base: '#a3e635' },
			bgColor: '#d9f99d'
		},
		{
			fontColor: '#eab308',
			iconColor: { icon: '#facc13', base: '#facc13' },
			bgColor: '#fef08a'
		},
		{
			fontColor: '#f59e0b',
			iconColor: { icon: '#f9bf23', base: '#f9bf23' },
			bgColor: '#fde68a'
		},
		{
			fontColor: '#f97316',
			iconColor: { icon: '#f7923d', base: '#f7923d' },
			bgColor: '#fed7aa'
		},
		{
			fontColor: '#ef4444',
			iconColor: { icon: '#f67171', base: '#f67171' },
			bgColor: '#fecaca'
		}
	];

	if (!proportion) {
		return colors;
	}

	return colors.map(color => ({
		fontColor: vivify(color.fontColor, proportion, 0.08),
		iconColor: {
			icon: vivify(color.iconColor.icon, proportion),
			base: vivify(color.iconColor.base, proportion)
		},
		bgColor: vivify(color.bgColor, proportion)
	}));
}

export function getPorts(alreadyAdded: number[]) {
	const allPorts = [
		//R2
		{ value: 10, label: 1 },
		{ value: 3, label: 2 },
		{ value: 4, label: 3 },
		{ value: 17, label: 4 },
		{ value: 18, label: 5 },
		{ value: 27, label: 6 },
		{ value: 22, label: 7 },
		{ value: 23, label: 8 },

		{ value: 24, label: 9 },
		{ value: 10, label: 10 },
		{ value: 9, label: 11 },
		{ value: 25, label: 12 },
		{ value: 11, label: 13 },
		{ value: 8, label: 14 },
		{ value: 7, label: 15 },

		{ value: 5, label: 16 },
		{ value: 6, label: 17 },
		{ value: 12, label: 18 },
		{ value: 13, label: 19 },
		{ value: 19, label: 20 },
		{ value: 16, label: 21 },
		{ value: 26, label: 22 },
		{ value: 20, label: 23 },
		{ value: 21, label: 24 }
	];
	const filtered = allPorts.filter(x => alreadyAdded.indexOf(x.value) < 0);
	return filtered;
}
