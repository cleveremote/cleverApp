import {useEffect, useRef} from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {isTempId} from '../../../services/socket';
import {hapticOptions} from '../../data/cycleTypes';
import {
	useSectionSettingsHeader,
	InvalidSections
} from '../../components/common/useSectionSettingsHeader';
import {DeviceType} from '../../data/modbusTypes';

// Shared editing logic for a device settings menu (master or slave), modelled
// on CycleSettingsScreen: masters and slaves both live in the shared
// `state.root_device.device` slot, so a master menu and a nested slave menu can
// coexist without hijacking each other's unsaved edits. A per-instance ref only
// follows the slice while it still refers to THIS screen's entity, guarded by
// `entityId` (edit flow) / `staleIdOnMount` (create flow: loadDevice runs in a
// useEffect, so on mount the slice still holds the previously edited device).
export function useDeviceEntity(
	props: any,
	type: DeviceType,
	validate?: (device: any) => InvalidSections
) {
	const isCreateFlow = props.route.params?.deviceId == null;
	const staleIdOnMount = useRef<string | undefined>(
		isCreateFlow ? props.device?.id : undefined
	);
	const entityId = useRef<string | undefined>(props.route.params?.deviceId);
	const deviceRef = useRef<any>(isCreateFlow ? undefined : props.device);

	if (props.device) {
		if (entityId.current == null) {
			if (props.route.params?.deviceId != null) {
				entityId.current = props.route.params.deviceId;
			} else if (
				isTempId(props.device.id) &&
				props.device.id !== staleIdOnMount.current &&
				props.device.type === type
			) {
				// Freshly created by our loadDevice — adopt its id.
				entityId.current = props.device.id;
			}
		}
		if (props.device.id === entityId.current) {
			deviceRef.current = props.device;
		}
	}

	// Latest `devices` slice, read at save/hasChanges time. A slave soft-saves its
	// edits into this list (see stageDevice) and marks itself `isModified`; the
	// master detects those pending slaves both to light up its save button and to
	// embed them in the single tree it sends when it saves.
	const devicesRef = useRef<any[]>(props.devices);
	devicesRef.current = props.devices;

	// Flat modbusTasks list (master screen only), used to hydrate the comRequests
	// of slaves the user never opened when assembling the full save tree.
	const modbusTasksRef = useRef<any[]>(props.modbusTasks);
	modbusTasksRef.current = props.modbusTasks;

	const dirtySlaves = (masterId: any) =>
		(devicesRef.current || []).filter(
			(d: any) =>
				d.type === 'SLAVE' &&
				d.config?.masterDeviceId &&
				`${d.config.masterDeviceId}` === `${masterId}` &&
				!!d.isModified
		);

	const hasChanges = (ref: any) =>
		ref?.isModified ||
		ref?.comRequests?.some((cr: any) => !!cr.isModified) ||
		(type === 'MASTER' && dirtySlaves(ref?.id).length > 0);

	// Assemble the whole device tree the master persists in one shot: the master
	// carrying every one of its slaves, each slave carrying its comRequests.
	// Entities flagged `delete` are kept (with their flag) so the box handles the
	// deletions inside the same tree. A slave the user opened already carries an
	// in-memory `comRequests` list; one never opened is hydrated from the flat
	// modbusTasks list so its existing requests aren't dropped.
	const buildTree = (master: any) => {
		const slaves = (devicesRef.current || [])
			.filter(
				(d: any) =>
					d.type === 'SLAVE' &&
					d.config?.masterDeviceId &&
					`${d.config.masterDeviceId}` === `${master?.id}`
			)
			.map((slave: any) => ({
				...slave,
				comRequests:
					slave.comRequests ??
					(modbusTasksRef.current || []).filter(
						(t: any) => `${t.deviceId}` === `${slave.id}`
					)
			}));
		return {...master, slaveDevices: slaves};
	};

	// A slave validating (or leaving with pending edits) only soft-saves into the
	// in-memory list; the box call happens on the master's save. The master sends
	// its whole tree (itself + slaves + comRequests) in a single sync so the box
	// receives a complete, ordered snapshot and persists everything at once.
	const performSave = (onDone: () => void) => {
		if (type === 'SLAVE') {
			props.stageDevice(deviceRef.current);
			onDone();
			return;
		}
		props.saveDeviceTree(buildTree(deviceRef.current), onDone);
	};

	const deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		deviceRef.current = {
			...deviceRef.current,
			delete: true,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadDevice(
			props.route.params?.deviceId,
			props.route.params?.defaults
		);
		// Master only: preload the flat modbusTasks so buildTree can hydrate the
		// comRequests of slaves the user hasn't opened.
		props.loadModbusTasks?.();
	}, []);

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.device,
		isNew: isCreateFlow,
		hasChanges: () => hasChanges(deviceRef.current),
		save: onDone => performSave(onDone),
		validate: validate ? () => validate(deviceRef.current) : undefined,
		backWhenPristine: true
	});

	// `ready` = the entity THIS screen owns is actually loaded into the shared
	// slot. On mount the slot still holds the previously edited device (for a
	// slave, its parent master — loadDevice runs in a useEffect), so the embedded
	// form sections must not mount yet: react-hook-form seeds its defaultValues
	// once at mount and never re-reads them, so mounting against the wrong entity
	// would leave the form (and thus the staged edits) filled with foreign fields.
	const ready =
		deviceRef.current != null &&
		deviceRef.current.id === entityId.current;

	return {deviceRef, deleteItem, invalidSections, ready};
}
