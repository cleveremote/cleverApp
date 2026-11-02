// Joignabilité des devices Modbus (masters et slaves) et dépendances des
// exécutables envers eux.
//
// Le box publie l'état de chaque device sous la forme
// `{deviceId, connected, changedAt, error?}`, relu sur `devices[].connectivity`
// de `front/box/fetch/configuration` puis poussé en direct sur
// `front/synchronize/device-status`. Ces états sont rangés à part, dans
// `root_device.connectivity` (indexé par deviceId), pour ne pas être confondus
// avec les éditions d'un device ni renvoyés au box à la sauvegarde.
//
// Chaîne de dépendances :
//   cycle / groupe -> séquences -> moduleConfigs[].moduleId -> actuator
//   actuator COM/CTRL -> config.deviceId (slave) [+ CTRL : flowMeterId, un sensor]
//   sensor -> config.comRequestId -> modbusTask.deviceId (slave), ou parentId
//   slave -> config.masterDeviceId (master)
// Un slave dont le master est injoignable est lui-même injoignable.

import i18n from 'i18next';

export interface DeviceConnectivity {
	deviceId: string;
	connected: boolean;
	changedAt?: string;
	error?: string | null;
}

export type ConnectivityMap = Record<string, DeviceConnectivity>;

export type ConnectivityState = 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN';

export interface EffectiveConnectivity {
	state: ConnectivityState;
	changedAt?: string;
	error?: string | null;
	// Device réellement en échec : le master quand c'est lui qui ne répond pas.
	source?: any;
}

export interface UnreachableDevice {
	device: any;
	error?: string | null;
	changedAt?: string;
	// Device à ouvrir pour voir le problème (master ou slave).
	source: any;
}

// Données nécessaires pour remonter d'un exécutable jusqu'à ses devices.
export interface DependencyContext {
	cycles?: any[];
	sensors?: any[];
	actuators?: any[];
	modbusTasks?: any[];
}

const key = (id: any) => `${id}`;

const time = (iso?: string) => {
	const t = iso ? Date.parse(iso) : NaN;
	return Number.isNaN(t) ? undefined : t;
};

// Un état plus ancien que celui connu (réponse en retard, relecture en base
// après un événement direct) ne l'écrase pas.
export const isNewer = (
	next: DeviceConnectivity,
	prev?: DeviceConnectivity
): boolean => {
	const n = time(next.changedAt);
	const p = time(prev?.changedAt);
	return n === undefined || p === undefined || n >= p;
};

// Le topic envoie une chaîne JSON, mais un objet peut aussi arriver tel quel.
export const parseConnectivity = (raw: any): DeviceConnectivity | undefined => {
	let data = raw;
	if (typeof raw === 'string') {
		try {
			data = JSON.parse(raw);
		} catch {
			return undefined;
		}
	}
	if (!data?.deviceId || typeof data.connected !== 'boolean') {
		return undefined;
	}
	return {
		deviceId: key(data.deviceId),
		connected: data.connected,
		changedAt: data.changedAt,
		error: data.connected ? null : data.error ?? null
	};
};

export const mergeConnectivity = (
	map: ConnectivityMap,
	entries: DeviceConnectivity[]
): ConnectivityMap => {
	let next = map;
	entries.forEach(entry => {
		if (!isNewer(entry, next[entry.deviceId])) return;
		if (next === map) next = {...map};
		next[entry.deviceId] = entry;
	});
	return next;
};

// Reconstruit la map depuis la liste des devices de la configuration. Les
// devices disparus sont écartés ; un état connu plus récent que celui relu en
// base (événement reçu entre-temps) est conservé.
export const connectivityFromDevices = (
	devices: any[] = [],
	previous: ConnectivityMap = {}
): ConnectivityMap => {
	const next: ConnectivityMap = {};
	(devices || []).forEach((device: any) => {
		if (!device?.id) return;
		const id = key(device.id);
		const loaded = parseConnectivity(
			device.connectivity && {deviceId: id, ...device.connectivity}
		);
		const known = previous[id];
		if (loaded && isNewer(loaded, known)) {
			next[id] = loaded;
		} else if (known) {
			next[id] = known;
		}
	});
	return next;
};

const findDevice = (devices: any[] = [], id: any) =>
	(devices || []).find((d: any) => key(d.id) === key(id));

export const masterOf = (device: any, devices: any[] = []) =>
	device?.type === 'SLAVE' && device.config?.masterDeviceId != null
		? findDevice(devices, device.config.masterDeviceId)
		: undefined;

// État d'un device en tenant compte de son master : un slave n'est pas
// joignable quand son master ne l'est pas, quel que soit son propre état.
export const effectiveConnectivity = (
	device: any,
	devices: any[] = [],
	connectivity: ConnectivityMap = {}
): EffectiveConnectivity => {
	const own = device?.id != null ? connectivity[key(device.id)] : undefined;
	const master = masterOf(device, devices);
	const masterState = master ? connectivity[key(master.id)] : undefined;
	if (masterState && !masterState.connected) {
		return {
			state: 'DISCONNECTED',
			changedAt: masterState.changedAt,
			error: i18n.t('common:devicesUnreachable.master', {
				name: master.name ?? master.id
			}),
			source: master
		};
	}
	if (!own) {
		return {state: 'UNKNOWN'};
	}
	return own.connected
		? {state: 'CONNECTED', changedAt: own.changedAt, source: device}
		: {
				state: 'DISCONNECTED',
				changedAt: own.changedAt,
				error: own.error,
				source: device
		  };
};

// Ids des devices dont dépend un sensor (un enfant hérite de son parent).
export const sensorDeviceIds = (
	sensor: any,
	ctx: DependencyContext,
	seen: Set<string> = new Set()
): string[] => {
	if (!sensor || seen.has(`sensor:${key(sensor.id)}`)) return [];
	seen.add(`sensor:${key(sensor.id)}`);
	if (sensor.parentId != null) {
		const parent = (ctx.sensors || []).find(
			(s: any) => key(s.id) === key(sensor.parentId)
		);
		return sensorDeviceIds(parent, ctx, seen);
	}
	const ids: string[] = [];
	// Ancien modèle : la requête Modbus (comRequestId) porte le slave.
	const comRequestId = sensor.config?.comRequestId;
	if (comRequestId != null) {
		const task = (ctx.modbusTasks || []).find(
			(t: any) => key(t.id) === key(comRequestId)
		);
		if (task?.deviceId != null) ids.push(key(task.deviceId));
	}
	// Modèle « commande d'appareil » (config.commandId) : le slave lu est
	// porté par le sensor lui-même, selon l'endroit où le box le renvoie.
	[
		sensor.config?.deviceId,
		sensor.config?.slaveDeviceId,
		sensor.deviceCommand?.deviceId,
		sensor.deviceId
	].forEach(id => {
		if (id != null && id !== '') ids.push(key(id));
	});
	return ids;
};

// Ids des devices dont dépend un actuator. Un RPI pilote un GPIO local.
export const actuatorDeviceIds = (
	actuator: any,
	ctx: DependencyContext,
	seen: Set<string> = new Set()
): string[] => {
	if (!actuator || actuator.type === 'RPI') return [];
	const ids: string[] = [];
	if (actuator.config?.deviceId != null) ids.push(key(actuator.config.deviceId));
	if (actuator.config?.flowMeterId != null) {
		const flowMeter = (ctx.sensors || []).find(
			(s: any) => key(s.id) === key(actuator.config.flowMeterId)
		);
		ids.push(...sensorDeviceIds(flowMeter, ctx, seen));
	}
	return ids;
};

export const sequenceDeviceIds = (
	sequence: any,
	ctx: DependencyContext,
	seen: Set<string> = new Set()
): string[] =>
	(sequence?.moduleConfigs || [])
		.filter((m: any) => !m?.delete)
		.flatMap((m: any) =>
			actuatorDeviceIds(
				(ctx.actuators || []).find(
					(a: any) => key(a.id) === key(m.moduleId)
				),
				ctx,
				seen
			)
		);

// Un groupe dépend des devices de ses cycles enfants (`childCycles`).
export const cycleDeviceIds = (
	cycle: any,
	ctx: DependencyContext,
	seen: Set<string> = new Set()
): string[] => {
	if (!cycle || seen.has(`cycle:${key(cycle.id)}`)) return [];
	seen.add(`cycle:${key(cycle.id)}`);
	const own = (cycle.sequences || [])
		.filter((s: any) => !s?.delete)
		.flatMap((s: any) => sequenceDeviceIds(s, ctx, seen));
	const children = (cycle.childCycles || []).flatMap((child: any) =>
		cycleDeviceIds(
			(ctx.cycles || []).find(
				(c: any) => key(c.id) === key(child.cycleId)
			),
			ctx,
			seen
		)
	);
	return [...own, ...children];
};

// Devices injoignables parmi `deviceIds` (dédoublonnés). Un état inconnu ne
// bloque rien : seul un échec avéré rend l'exécutable non exécutable.
export const unreachableDevices = (
	deviceIds: string[],
	devices: any[] = [],
	connectivity: ConnectivityMap = {}
): UnreachableDevice[] => {
	const result: UnreachableDevice[] = [];
	new Set(deviceIds).forEach(id => {
		const device = findDevice(devices, id);
		if (!device) return;
		const eff = effectiveConnectivity(device, devices, connectivity);
		if (eff.state === 'DISCONNECTED') {
			result.push({
				device,
				error: eff.error,
				changedAt: eff.changedAt,
				source: eff.source ?? device
			});
		}
	});
	return result;
};

// État agrégé d'un ensemble de devices : injoignable si l'un l'est, inconnu
// si l'un n'a jamais été vérifié, NONE quand l'exécutable ne dépend d'aucun
// device (RPI, FORCAST…).
export const aggregateConnectivity = (
	deviceIds: string[],
	devices: any[] = [],
	connectivity: ConnectivityMap = {}
): ConnectivityState | 'NONE' => {
	const states = [...new Set(deviceIds)]
		.map(id => findDevice(devices, id))
		.filter(Boolean)
		.map(d => effectiveConnectivity(d, devices, connectivity).state);
	if (!states.length) return 'NONE';
	if (states.includes('DISCONNECTED')) return 'DISCONNECTED';
	if (states.includes('UNKNOWN')) return 'UNKNOWN';
	return 'CONNECTED';
};

// Raccourci depuis le state redux.
const contextOf = (state: any): DependencyContext => ({
	cycles: state.root_cycle?.cycles,
	sensors: state.root_sensor?.sensors,
	actuators: state.root_actuator?.actuators,
	modbusTasks: state.root_modbus_task?.modbusTasks
});

export type ExecutableKind = 'CYCLE' | 'SEQUENCE' | 'SENSOR';

export const executableDeviceIds = (
	item: any,
	kind: ExecutableKind,
	ctx: DependencyContext
): string[] => {
	if (kind === 'SENSOR') return sensorDeviceIds(item, ctx);
	if (kind === 'SEQUENCE') return sequenceDeviceIds(item, ctx);
	return cycleDeviceIds(item, ctx);
};

export const selectUnreachableDevices = (
	state: any,
	item: any,
	kind: ExecutableKind
): UnreachableDevice[] => {
	const ids = executableDeviceIds(item, kind, contextOf(state));
	return unreachableDevices(
		ids,
		state.root_device?.devices,
		state.root_device?.connectivity
	);
};

// Retrouve un cycle, un groupe ou une séquence par son id.
export const findExecutable = (
	cycles: any[] = [],
	id: any
): {item: any; kind: ExecutableKind} | undefined => {
	for (const cycle of cycles || []) {
		if (key(cycle?.id) === key(id)) return {item: cycle, kind: 'CYCLE'};
		const sequence = (cycle?.sequences || []).find(
			(s: any) => key(s?.id) === key(id)
		);
		if (sequence) return {item: sequence, kind: 'SEQUENCE'};
	}
	return undefined;
};

export const describeUnreachable = (list: UnreachableDevice[]) =>
	list
		.map(
			({device, error}) =>
				`${device.name ?? device.id}${error ? ` (${error})` : ''}`
		)
		.join('\n');
