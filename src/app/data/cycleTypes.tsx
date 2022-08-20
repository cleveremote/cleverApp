import { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { OrientationType } from "react-native-orientation-locker";
export const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};
export type CyclesStackParamList = {
    Cycles: undefined;
    Settings: undefined;
    SequenceSettings: undefined;
    Schedule: undefined;
};

export type navigationCycleType = NativeStackNavigationProp<CyclesStackParamList, 'Cycles'>;

export interface ICyclesProps {
    navigation: navigationCycleType
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
    loadConfiguration: Function;
    listenerEvents: Function;
    executePartialSync: Function;
    loadCycle: Function;
    saveCycle: Function;
    process: any;
    navigation: any;
    route: any
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
    refreshing: boolean,
    orientation: OrientationType,
    sequencesData: any[],
    formData: any,
    isOpen: boolean,
    enableScroll: boolean;
    //////:

    cycleFormData: any;
    saveUnchangedData: boolean;
    activeMenu?: string;
};

export const cycleData: CycleType = {
    id: 'cycle_1',
    sequences: [
        {
            id: '1',
            key: '1',
            name: 'sequence 1',
            description: 'description sequence 1',
            duration: 5000,
            modules: [16, 19],
        },
        {
            id: '6',
            key: '6',
            name: 'sequence 6',
            description: 'description sequence 1',
            duration: 5000,
            modules: [16, 19],
        },
        {
            id: '2',
            key: '2',
            name: 'sequence 2',
            description: 'description sequence 1',
            duration: 5000,
            modules: [16, 19],
        },
        {
            id: '83',
            key: '83',
            name: 'sequence 3',
            description: 'description sequence 1',
            duration: 5000,
            modules: [16, 19],
        }

    ]
};


export const PriorityModes = [{ index: 0, label: 'Manual' }, { index: 1, label: 'Schedule' }, { index: 2, label: 'Trigger' }];
export const Priorities = PriorityModes.map((d) => {
    const backgroundColor = 'white';
    return {
        index: d.index,
        id: `item-${d.index}`,
        key: `item-${d.index}`,
        label: d.label,
        backgroundColor,
    };
})

export function getColors() {
    const iconColor = ['#f472b6', '#e879f9', '#94a3b8', '#818cf8', '#60a5fa', '#41bdf8', '#47d3ee', '#46d4bf', '#44d399', '#4ade80', '#a3e635', '#facc13', '#f9bf23', '#f7923d', '#f67171', '#FFFFFF'];
    const colors = ['pink', 'fuchsia', 'blueGray', 'indigo', 'blue', 'lightBlue', 'cyan', 'teal', 'emerald', 'green', 'lime', 'yellow', 'amber', 'orange', 'red'];
    return colors.map((x, i) => { return { base: x, icon: iconColor[i] } });
}

export function getPorts(alreadyAdded) {

    const allPorts = [21, 20, 26, 16, 19, 13, 12, 6, 5, 25, 24, 22, 23, 27, 18, 17];
    return allPorts.filter(x => alreadyAdded.indexOf(x) < 0);
}

