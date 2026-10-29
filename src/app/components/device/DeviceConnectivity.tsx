import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {hapticOptions} from '../../data/cycleTypes';
import {checkDevices} from '../../../module/process/infrasctructure/store/actions/device';
import {
	ConnectivityMap,
	ConnectivityState,
	EffectiveConnectivity,
	ExecutableKind,
	UnreachableDevice,
	aggregateConnectivity,
	effectiveConnectivity,
	executableDeviceIds,
	unreachableDevices
} from '../../../module/process/infrasctructure/store/models/deviceConnectivity';
import {isTempId} from '../../../services/socket';

// Le socket n'a pas de timeout : garde-fou pour ne pas bloquer le bouton.
const CHECK_TIMEOUT_MS = 30000;

const COLORS: Record<ConnectivityState, string> = {
	CONNECTED: '#16a34a',
	DISCONNECTED: '#dc2626',
	UNKNOWN: '#9ca3af'
};

const LABELS: Record<ConnectivityState, string> = {
	CONNECTED: 'Connected',
	DISCONNECTED: 'Unreachable',
	UNKNOWN: 'Unknown'
};

const pad = (n: number) => `${n}`.padStart(2, '0');

// "29/10 08:12" : Intl n'est pas fiable sous Hermes/Android.
export const formatChangedAt = (iso?: string) => {
	const d = iso ? new Date(iso) : undefined;
	if (!d || Number.isNaN(d.getTime())) return undefined;
	return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(
		d.getHours()
	)}:${pad(d.getMinutes())}`;
};

const useDevicesState = () => {
	const devices = useSelector((s: any) => s.root_device.devices);
	const connectivity = useSelector((s: any) => s.root_device.connectivity);
	return {devices, connectivity};
};

export const useDeviceConnectivity = (device: any): EffectiveConnectivity => {
	const {devices, connectivity} = useDevicesState();
	return useMemo(
		() => effectiveConnectivity(device, devices, connectivity),
		[device, devices, connectivity]
	);
};

const useDependencyIds = (item: any, kind: ExecutableKind) => {
	const cycles = useSelector((s: any) => s.root_cycle.cycles);
	const sensors = useSelector((s: any) => s.root_sensor.sensors);
	const actuators = useSelector((s: any) => s.root_actuator.actuators);
	const modbusTasks = useSelector(
		(s: any) => s.root_modbus_task.modbusTasks
	);
	return useMemo(() => {
		const ids = executableDeviceIds(item, kind, {
			cycles,
			sensors,
			actuators,
			modbusTasks
		});
		// TEMP diagnostic: sensor COM dont le slave n'est pas résolu.
		if (__DEV__ && kind === 'SENSOR' && item?.type === 'COM' && !ids.length) {
			console.log('[connectivity] sensor without device', item?.name, {
				parentId: item?.parentId,
				deviceId: item?.deviceId,
				config: item?.config,
				deviceCommand: item?.deviceCommand && Object.keys(item.deviceCommand)
			});
		}
		return ids;
	}, [item, kind, cycles, sensors, actuators, modbusTasks]);
};

// Devices injoignables dont dépend un cycle/groupe, une séquence ou un sensor.
export const useUnreachableDevices = (item: any, kind: ExecutableKind) => {
	const {devices, connectivity} = useDevicesState();
	const ids = useDependencyIds(item, kind);
	return useMemo(
		() => unreachableDevices(ids, devices, connectivity),
		[ids, devices, connectivity]
	);
};

// État agrégé des devices de chaque sensor, sous forme de signature stable
// "id:état|…" pour réagir aux seuls changements d'état.
export const useSensorsConnectivity = (list: any[]) => {
	const {devices, connectivity} = useDevicesState();
	const sensors = useSelector((s: any) => s.root_sensor.sensors);
	const actuators = useSelector((s: any) => s.root_actuator.actuators);
	const modbusTasks = useSelector(
		(s: any) => s.root_modbus_task.modbusTasks
	);
	return list
		.map(sensor => {
			const ids = executableDeviceIds(sensor, 'SENSOR', {
				sensors,
				actuators,
				modbusTasks
			});
			return `${sensor.id}:${aggregateConnectivity(ids, devices, connectivity)}`;
		})
		.join('|');
};

// Pastille d'état des devices dont dépend un exécutable ; rien quand il n'en
// dépend d'aucun.
export function ExecutableConnectivityDot(
	props: Readonly<{item: any; kind: ExecutableKind; style?: any}>
) {
	const {devices, connectivity} = useDevicesState();
	const ids = useDependencyIds(props.item, props.kind);
	const state = useMemo(
		() => aggregateConnectivity(ids, devices, connectivity),
		[ids, devices, connectivity]
	);
	// Seul l'état inconnu est signalé : rien quand tout est joignable, et
	// DeviceDisconnectedIcon prend le relais en cas de déconnexion.
	if (state !== 'UNKNOWN') return null;
	return (
		<View
			style={[
				styles.dot,
				styles.dotOutline,
				{backgroundColor: COLORS[state]},
				props.style
			]}
		/>
	);
}

// Contour d'une carte (cycle, groupe, sensor) dont un device est injoignable,
// et couleur de l'icône « déconnecté » qui l'accompagne.
export const WARNING_BORDER = '#fdba74';

// Pastille d'état, pour les lignes de la liste des devices ; icône
// « déconnecté » quand le device est injoignable.
export function DeviceConnectivityDot({device}: Readonly<{device: any}>) {
	const {state} = useDeviceConnectivity(device);
	if (state === 'DISCONNECTED') {
		return <Icon name="unlink" size={14} color={WARNING_BORDER} />;
	}
	return <View style={[styles.dot, {backgroundColor: COLORS[state]}]} />;
}

// Texte d'avertissement d'une ligne de device injoignable (cf. elementStack),
// undefined sinon.
export const deviceRowWarning = (
	device: any,
	devices: any[] = [],
	connectivity: ConnectivityMap = {}
): string | undefined => {
	const {state, error, changedAt} = effectiveConnectivity(
		device,
		devices,
		connectivity
	);
	if (state !== 'DISCONNECTED') return undefined;
	const at = formatChangedAt(changedAt);
	return [`Unreachable${at ? ` since ${at}` : ''}`, error]
		.filter(Boolean)
		.join(' — ');
};

// Lance front/box/check/device pour chaque id (aucun : tous les devices).
// `busy` repasse à false quand toutes les réponses sont arrivées.
export const useCheckDevices = () => {
	const dispatch = useDispatch<any>();
	const [busy, setBusy] = useState(false);
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timeout.current) clearTimeout(timeout.current);
		},
		[]
	);

	const check = (deviceIds?: string[]) => {
		const ids = (deviceIds || []).filter(id => !isTempId(id));
		if (deviceIds?.length && !ids.length) {
			Alert.alert(
				'Save the device first',
				'A device must be saved before its connectivity can be checked.'
			);
			return;
		}
		setBusy(true);
		const finish = () => {
			if (timeout.current) clearTimeout(timeout.current);
			timeout.current = null;
			setBusy(false);
		};
		timeout.current = setTimeout(() => {
			timeout.current = null;
			setBusy(false);
			Alert.alert(
				'Check timed out',
				'The box did not answer. Check the connection and try again.'
			);
		}, CHECK_TIMEOUT_MS);
		let pending = ids.length || 1;
		const done = () => {
			pending -= 1;
			if (pending <= 0) finish();
		};
		if (ids.length) {
			ids.forEach(id => dispatch(checkDevices(id, done)));
		} else {
			dispatch(checkDevices(undefined, done));
		}
	};

	return {busy, check};
};

export function CheckDevicesButton(
	props: Readonly<{
		deviceIds?: string[];
		label: string;
		variant?: 'primary' | 'outline';
		color?: string;
		style?: any;
	}>
) {
	const {busy, check} = useCheckDevices();
	const outline = props.variant === 'outline';
	const color = props.color ?? '#32404e';
	const fg = outline ? color : 'white';
	return (
		<TouchableOpacity
			style={[
				styles.button,
				outline
					? {borderWidth: 1, borderColor: color}
					: {backgroundColor: color},
				busy && {opacity: 0.7},
				props.style
			]}
			disabled={busy}
			onPress={() => {
				ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
				check(props.deviceIds);
			}}>
			{busy ? (
				<ActivityIndicator size="small" color={fg} />
			) : (
				<Icon name="sync-alt" size={outline ? 12 : 15} color={fg} />
			)}
			<Text style={[styles.buttonLabel, {color: fg}, outline && {fontSize: 14}]}>
				{busy ? 'Checking…' : props.label}
			</Text>
		</TouchableOpacity>
	);
}

// État détaillé d'un master/slave et vérification manuelle (écran de réglages).
export function DeviceConnectivityPanel({device}: Readonly<{device: any}>) {
	const {state, changedAt, error} = useDeviceConnectivity(device);
	const at = formatChangedAt(changedAt);
	let detail = 'Never checked';
	if (state === 'CONNECTED') detail = at ? `Connected since ${at}` : 'Connected';
	if (state === 'DISCONNECTED') detail = at ? `Lost at ${at}` : 'Unreachable';
	const scope =
		device?.type === 'MASTER'
			? 'Checks the master, then its slaves if it answers.'
			: 'Checks the master first, then this slave if the master answers.';
	return (
		<View style={styles.panel}>
			<View style={styles.row}>
				<View style={[styles.dot, {backgroundColor: COLORS[state]}]} />
				<Text style={[styles.state, {color: COLORS[state]}]}>
					{LABELS[state]}
				</Text>
			</View>
			<Text style={styles.detail}>{detail}</Text>
			{state === 'DISCONNECTED' && error ? (
				<Text style={styles.error} numberOfLines={3}>
					{error}
				</Text>
			) : null}
			<Text style={styles.hint}>{scope}</Text>
			<CheckDevicesButton
				deviceIds={device?.id != null ? [`${device.id}`] : []}
				label="Check now"
			/>
		</View>
	);
}

const ALERT = {
	accent: '#dc2626',
	text: '#991b1b',
	muted: '#6b7280'
};

// Écran de réglages du device, enregistré sous `DeviceSettings` dans les
// stacks Cycles / Fertigation / Sensors : le retour ramène à la carte.
// L'accordéon Connectivity est ouvert d'office.
export const openDeviceSettings = (navigation: any, device: any) => {
	const params = {deviceId: device.id, section: 'connectivity'};
	navigation.navigate(
		'DeviceSettings',
		device.type === 'MASTER'
			? {screen: 'MasterDeviceSettingsMenu', params}
			: {
					screen: 'SlaveDeviceSettingsStack',
					params: {screen: 'SlaveDeviceSettingsMenu', params}
			  }
	);
};

// Devices à ouvrir : plusieurs slaves tombés avec leur master se résument au
// master, seul vrai problème de connexion.
const failingSources = (unreachable: UnreachableDevice[]) => {
	const bySource = new Map<string, {source: any; error?: string | null; changedAt?: string; slaves: any[]}>();
	unreachable.forEach(({device, source, error, changedAt}) => {
		const id = `${source.id}`;
		const entry = bySource.get(id) ?? {
			source,
			error: source === device ? error : undefined,
			changedAt,
			slaves: []
		};
		if (source !== device) entry.slaves.push(device);
		else entry.error = error;
		bySource.set(id, entry);
	});
	return [...bySource.values()];
};

// Icône « déconnecté » d'une carte de cycle/groupe ou de sensor. Un tap
// détaille les devices en cause et mène au master ou au slave en échec.
export function DeviceDisconnectedIcon(
	props: Readonly<{
		item: any;
		kind: ExecutableKind;
		navigation: any;
		color?: string;
		size?: number;
		// Ouverture pilotée par la carte (tap n'importe où hors menu) : l'icône
		// n'est alors qu'un indicateur.
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}>
) {
	const [ownOpen, setOwnOpen] = useState(false);
	const controlled = props.onOpenChange != null;
	const open = controlled ? !!props.open : ownOpen;
	const setOpen = controlled ? props.onOpenChange! : setOwnOpen;
	const {devices, connectivity} = useDevicesState();
	const unreachable = useUnreachableDevices(props.item, props.kind);
	if (!unreachable.length) return null;
	const sources = failingSources(unreachable);
	const title =
		props.kind === 'SENSOR'
			? 'No reading: device disconnected'
			: 'Cannot start: device disconnected';

	return (
		<>
			{controlled ? (
				<Icon
					name="unlink"
					size={props.size ?? 18}
					color={props.color ?? WARNING_BORDER}
				/>
			) : (
				<TouchableOpacity
					hitSlop={8}
					onPress={() => {
						ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
						setOpen(true);
					}}>
					<Icon
						name="unlink"
						size={props.size ?? 18}
						color={props.color ?? WARNING_BORDER}
					/>
				</TouchableOpacity>
			)}
			<Modal
				visible={open}
				transparent
				animationType="fade"
				onRequestClose={() => setOpen(false)}>
				<Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
					<Pressable style={styles.sheet}>
						<View style={styles.row}>
							<Icon name="unlink" size={16} color={ALERT.accent} />
							<Text style={styles.sheetTitle}>{title}</Text>
						</View>
						<Text style={styles.hint} numberOfLines={1}>
							{props.item?.name}
						</Text>
						{sources.map(({source, error, changedAt, slaves}) => {
							const own = effectiveConnectivity(source, devices, connectivity);
							const at = formatChangedAt(changedAt ?? own.changedAt);
							return (
								<TouchableOpacity
									key={source.id}
									style={styles.sourceRow}
									onPress={() => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										setOpen(false);
										openDeviceSettings(props.navigation, source);
									}}>
									<View style={{flex: 1, gap: 2}}>
										<Text style={styles.sourceName} numberOfLines={1}>
											{`${source.type === 'MASTER' ? 'Master' : 'Slave'} · ${
												source.name ?? source.id
											}`}
										</Text>
										<Text style={styles.error} numberOfLines={3}>
											{error ?? own.error ?? 'unreachable'}
										</Text>
										{slaves.length ? (
											<Text style={styles.hint} numberOfLines={2}>
												{`Slaves affected: ${slaves
													.map(d => d.name ?? d.id)
													.join(', ')}`}
											</Text>
										) : null}
										{at ? (
											<Text style={styles.hint}>{`Lost at ${at}`}</Text>
										) : null}
									</View>
									<Icon name="chevron-right" size={14} color={ALERT.muted} />
								</TouchableOpacity>
							);
						})}
						<CheckDevicesButton
							label="Check again"
							deviceIds={sources.map(({source}) => `${source.id}`)}
						/>
					</Pressable>
				</Pressable>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5
	},
	// Lisible sur le fond coloré d'une carte.
	dotOutline: {
		borderWidth: 1.5,
		borderColor: 'white'
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	panel: {
		padding: 12,
		gap: 6
	},
	state: {
		fontWeight: 'bold',
		fontSize: 15
	},
	detail: {
		color: '#32404e',
		fontSize: 14
	},
	error: {
		color: '#991b1b',
		fontSize: 13
	},
	hint: {
		color: '#6b7280',
		fontSize: 12,
		fontStyle: 'italic'
	},
	button: {
		marginTop: 8,
		paddingVertical: 12,
		borderRadius: 12,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8
	},
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.4)',
		justifyContent: 'center',
		padding: 24
	},
	sheet: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 16,
		gap: 10
	},
	sheetTitle: {
		flex: 1,
		fontWeight: 'bold',
		fontSize: 16,
		color: ALERT.text
	},
	sourceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#fca5a5',
		backgroundColor: '#fef2f2'
	},
	sourceName: {
		fontWeight: 'bold',
		fontSize: 15,
		color: '#32404e'
	},
	buttonLabel: {
		fontSize: 15,
		fontWeight: 'bold'
	}
});
