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
	return [
		{
			fontColor: '#ec4899',
			iconColor: {icon: '#f472b6', base: '#f472b6'},
			bgColor: '#fbcfe8'
		},
		{
			fontColor: '#d946ef',
			iconColor: {icon: '#e879f9', base: '#e879f9'},
			bgColor: '#f0abfc'
		},
		{
			fontColor: '#64748b',
			iconColor: {icon: '#94a3b8', base: '#94a3b8'},
			bgColor: '#cbd5e1'
		},
		{
			fontColor: '#6366f1',
			iconColor: {icon: '#818cf8', base: '#818cf8'},
			bgColor: '#c7d2fe'
		},
		{
			fontColor: '#3b82f6',
			iconColor: {icon: '#60a5fa', base: '#60a5fa'},
			bgColor: '#bfdbfe'
		},
		{
			fontColor: '#0ea5e9',
			iconColor: {icon: '#41bdf8', base: '#41bdf8'},
			bgColor: '#bae6fd'
		},
		{
			fontColor: '#06b6d4',
			iconColor: {icon: '#47d3ee', base: '#47d3ee'},
			bgColor: '#a5f3fc'
		},
		{
			fontColor: '#14b8a6',
			iconColor: {icon: '#46d4bf', base: '#46d4bf'},
			bgColor: '#99f6e4'
		},
		{
			fontColor: '#10b981',
			iconColor: {icon: '#44d399', base: '#44d399'},
			bgColor: '#a7f3d0'
		},
		{
			fontColor: '#22c55e',
			iconColor: {icon: '#4ade80', base: '#4ade80'},
			bgColor: '#bbf7d0'
		},
		{
			fontColor: '#84cc16',
			iconColor: {icon: '#a3e635', base: '#a3e635'},
			bgColor: '#d9f99d'
		},
		{
			fontColor: '#eab308',
			iconColor: {icon: '#facc13', base: '#facc13'},
			bgColor: '#fef08a'
		},
		{
			fontColor: '#f59e0b',
			iconColor: {icon: '#f9bf23', base: '#f9bf23'},
			bgColor: '#fde68a'
		},
		{
			fontColor: '#f97316',
			iconColor: {icon: '#f7923d', base: '#f7923d'},
			bgColor: '#fed7aa'
		},
		{
			fontColor: '#ef4444',
			iconColor: {icon: '#f67171', base: '#f67171'},
			bgColor: '#fecaca'
		}
	];
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
