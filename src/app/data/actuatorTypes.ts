// Shared types, option lists and config defaults for the actuators area
// (Settings → Actuators). Mirrors the box's `ActuatorModel`: `type` decides
// which config shape the `config` object carries — RPI (GPIO of the Raspberry),
// COM (modbus commands) and CTRL (a COM actuator with a regulation loop).

import {valueLabel} from '../../i18n';

export enum ActuatorType {
	RPI = 'RPI',
	COM = 'COM',
	CTRL = 'CTRL'
}

// `onoff` GPIO values used by RpiActuatorConfigModel.
export enum GPIODirection {
	IN = 'in',
	OUT = 'out',
	HIGH = 'high',
	LOW = 'low'
}

export enum GPIOEdge {
	NONE = 'none',
	RISING = 'rising',
	FALLING = 'falling',
	BOTH = 'both'
}

// Le modèle box ne documente que PROPORTIONAL ; ON_OFF couvre les vannes
// tout-ou-rien. À ajuster ici si le backend attend d'autres valeurs.
export enum ValveType {
	PROPORTIONAL = 'PROPORTIONAL',
	ON_OFF = 'ON_OFF'
}

// Codes de la box : libellé traduit s'il existe (actuators:enum), sinon le code.
const toOptions = (e: Record<string, string>) =>
	Object.values(e).map(value => ({
		get label() {
			return valueLabel('actuators:enum', value);
		},
		value
	}));

export const actuatorTypeOptions = toOptions(ActuatorType);
export const gpioDirectionOptions = toOptions(GPIODirection);
export const gpioEdgeOptions = toOptions(GPIOEdge);
export const valveTypeOptions = toOptions(ValveType);

// Valeurs par défaut de chaque config, alignées sur celles portées par les
// classes du modèle (RpiActuatorConfigModel / CtrlActuatorConfigModel).
export const emptyRpiConfig = () => ({
	rpiPin: undefined,
	direction: GPIODirection.OUT,
	edge: GPIOEdge.NONE,
	debounceTimeout: undefined,
	activeLow: false,
	reconfigureDirection: true
});

// Les actions d'un COM / CTRL pointent une device command du modèle du slave,
// avec le channel (voie) à piloter en paramètre.
export const emptyComConfig = () => ({
	deviceId: undefined,
	actions: [] as {commandId?: string; channel?: number}[]
});

// Une vanne CTRL ne porte que ses paramètres physiques ; sa régulation
// (capteur, consigne, gains) est une ControlLoop (cf. controlLoopTypes).
export const emptyCtrlConfig = () => ({
	...emptyComConfig(),
	minOpening: 0,
	maxOpening: 100,
	openingPercent: 0,
	// Temps que met la vanne pour parcourir toute sa course (minOpening <->
	// maxOpening), en ms.
	fullStrokeMs: 7000,
	// Bornes de la valeur envoyée sur la sortie (channel) du slave.
	minOutputValue: undefined,
	maxOutputValue: undefined,
	valveType: ValveType.PROPORTIONAL
});

export const emptyActuatorConfig = (type: string): Record<string, any> => {
	if (type === ActuatorType.RPI) return emptyRpiConfig();
	if (type === ActuatorType.CTRL) return emptyCtrlConfig();
	return emptyComConfig();
};

// COM et CTRL partagent le couple deviceId + actions[] (CTRL étend COM).
export const isComBased = (type?: string) =>
	type === ActuatorType.COM || type === ActuatorType.CTRL;

// RPI actuators are labelled `RPI - <name>`; COM actuators target a slave device
// (`config.deviceId`): their label is prefixed with that device's name.
export const actuatorLabel = (actuator: any, devices: any[] = []) => {
	const name = `${actuator?.name ?? 'actuator'}`;
	if (actuator?.type === ActuatorType.RPI) return `RPI - ${name}`;
	if (actuator?.type !== ActuatorType.COM) return name;
	const device = devices.find(
		(d: any) => `${d.id}` === `${actuator.config?.deviceId}`
	);
	const deviceName = device?.name ?? device?.label;
	return deviceName ? `${deviceName} - ${name}` : name;
};

// Tri naturel sur le libellé : « Relay 2 » avant « Relay 10 ».
export const compareLabels = (a: string, b: string) =>
	`${a}`.localeCompare(`${b}`, undefined, {
		numeric: true,
		sensitivity: 'base'
	});

// Les actuators RPI listés (My RPI, section RPI des séquences) : non supprimés,
// triés par libellé.
export const listedRpiActuators = (actuators: any[] = [], devices: any[] = []) =>
	actuators
		.filter((a: any) => !a.delete && a.type === ActuatorType.RPI)
		.sort((a: any, b: any) =>
			compareLabels(actuatorLabel(a, devices), actuatorLabel(b, devices))
		);

// Port d'un actuator : la pin GPIO d'un RPI, le channel de l'action d'un
// COM / CTRL. undefined quand il n'est pas renseigné.
export const actuatorPort = (actuator: any): number | undefined => {
	const port =
		actuator?.type === ActuatorType.RPI
			? actuator?.config?.rpiPin
			: actuator?.config?.actions?.[0]?.channel;
	if (port === undefined || port === null || port === '') return undefined;
	const value = Number(port);
	return Number.isNaN(value) ? undefined : value;
};

// Tri par device (nom du slave pour COM / CTRL), puis par numéro de port, puis
// par libellé. Les ports non renseignés passent en dernier.
export const compareByDeviceAndPort =
	(devices: any[] = []) =>
	(a: any, b: any) => {
		const deviceName = (actuator: any) => {
			if (!isComBased(actuator?.type)) return '';
			const device = devices.find(
				(d: any) => `${d.id}` === `${actuator.config?.deviceId}`
			);
			return `${device?.name ?? device?.label ?? ''}`;
		};
		const byDevice = compareLabels(deviceName(a), deviceName(b));
		if (byDevice !== 0) return byDevice;
		const portA = actuatorPort(a) ?? Number.POSITIVE_INFINITY;
		const portB = actuatorPort(b) ?? Number.POSITIVE_INFINITY;
		if (portA !== portB) return portA < portB ? -1 : 1;
		return compareLabels(
			actuatorLabel(a, devices),
			actuatorLabel(b, devices)
		);
	};
