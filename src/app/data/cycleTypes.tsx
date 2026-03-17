import {
	NativeStackNavigationProp,
	NativeStackScreenProps
} from '@react-navigation/native-stack';
import {OrientationType} from 'react-native-orientation-locker';
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

export type navigationCycleType = NativeStackNavigationProp<
	CyclesStackParamList,
	'Cycles'
>;

export interface ICyclesProps {
	navigation: navigationCycleType;
}

export type CycleType = {
	id: string;
	sequences: any[];
};

export type SequenceItem = {
	key: string;
	id: string;
	name: string;
	description: string;
	duration: number;
	modules: ModuleItem[];
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
	{index: 0, label: 'Manual'},
	{index: 1, label: 'Schedule'},
	{index: 2, label: 'Trigger'}
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

export function getColors() {
	const iconColors = [
		'#f472b6',
		'#e879f9',
		'#94a3b8',
		'#818cf8',
		'#60a5fa',
		'#41bdf8',
		'#47d3ee',
		'#46d4bf',
		'#44d399',
		'#4ade80',
		'#a3e635',
		'#facc13',
		'#f9bf23',
		'#f7923d',
		'#f67171',
		'#FFFFFF'
	];
	const colors = [
		'pink',
		'fuchsia',
		'blueGray',
		'indigo',
		'blue',
		'lightBlue',
		'cyan',
		'teal',
		'emerald',
		'green',
		'lime',
		'yellow',
		'amber',
		'orange',
		'red'
	];

	return colors.map((x, i) => {
		const fontColor = x + '.500';
		const iconColor = {icon: iconColors[i], base: x + '.500'};
		const bgColor = x + '.200';
		return {fontColor, iconColor, bgColor};
	});
}

export function getPorts(alreadyAdded: number[]) {
	const allPorts = [
		//R2
		{value: 26, label: 1},
		{value: 19, label: 2},
		{value: 13, label: 3},
		{value: 6, label: 4},
		{value: 5, label: 5},
		{value: 22, label: 6},
		{value: 27, label: 7},
		{value: 17, label: 8},
		//R1
		{value: 12, label: 'free relay 1'},
		{value: 25, label: 'free relay 2'},
		{value: 24, label: 'free relay 3'},
		{value: 23, label: 'free relay 4'},
		{value: 18, label: 'free relay 5'}
	];
	const filtered = allPorts.filter(x => alreadyAdded.indexOf(x.value) < 0);
	return filtered;
}
