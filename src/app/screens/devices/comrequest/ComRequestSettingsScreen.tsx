import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faGear, faSliders} from '@fortawesome/free-solid-svg-icons';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../components/common/cycleMenu';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import {
	useSectionSettingsHeader,
	isEmpty
} from '../../../components/common/useSectionSettingsHeader';
import {hapticOptions} from '../../../data/cycleTypes';
import {updateModbusTask} from '../../../../module/process/infrasctructure/store/actions/modbus-task';
import {updateDevice} from '../../../../module/process/infrasctructure/store/actions/device';
import {isTempId, newTempId} from '../../../../services/socket';
import ComRequestGeneralSettingsSection from './ComRequestGeneralSettingsSection';
import ComRequestConfigurationSettingsSection from './ComRequestConfigurationSettingsSection';

// A COM request belongs to its slave device. This menu edits it in a transient
// scratch slot (root_modbus_task.modbusTask) via its General / Configuration
// sections, then commits it into the parent slave's in-memory `comRequests`
// list. Nothing is sent to the box here: the slave carries its comRequests and
// the master's save persists the whole tree (front/box/sync/device).
export function ComRequestSettingsScreen(props: any) {
	const slaveId = props.route.params?.slaveId;
	const comRequestId = props.route.params?.comRequestId;
	const isNew = comRequestId == null;

	// The parent slave lives in the shared device slot while its settings stack
	// is open; keep a ref so commit/delete always read the latest copy.
	const deviceRef = useRef(props.device);
	deviceRef.current = props.device;

	const taskRef = useRef(props.modbusTask);
	taskRef.current = props.modbusTask;

	// Seed the scratch slot from the slave's comRequests (edit) or a fresh temp
	// entity (create). Runs once on mount, mirroring the device load flow.
	useEffect(() => {
		if (isNew) {
			props.updateModbusTask({
				id: newTempId(),
				isModified: true,
				...props.route.params?.defaults
			});
		} else {
			const existing = (deviceRef.current?.comRequests ?? []).find(
				(cr: any) => cr.id === comRequestId
			);
			if (existing) props.updateModbusTask({...existing});
		}
	}, []);

	// Upsert the scratch task into the slave's comRequests, then let the header
	// proceed. No socket call: we mark the SLAVE `isModified` so its own settings
	// screen shows the save button AND the master detects it as a dirty slave
	// (dirtySlaves keys off the slave's flag) — the master save then persists the
	// whole device tree (front/box/sync/device).
	const commit = (task: any, onDone: () => void) => {
		const list = deviceRef.current?.comRequests ?? [];
		const index = list.findIndex((cr: any) => cr.id === task.id);
		const next =
			index > -1
				? list.map((cr: any, i: number) =>
						i === index ? {...task, isModified: true} : cr
				  )
				: [...list, {...task, isModified: true}];
		props.updateDevice({
			...deviceRef.current,
			comRequests: next,
			isModified: true
		});
		onDone();
	};

	const deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		const list = deviceRef.current?.comRequests ?? [];
		const next = list
			.map((cr: any) =>
				cr.id === taskRef.current?.id
					? {...cr, delete: true, isModified: true}
					: cr
			)
			// A never-persisted temp request can just be dropped outright.
			.filter((cr: any) => !(cr.delete && isTempId(cr.id)));
		props.updateDevice({
			...deviceRef.current,
			comRequests: next,
			isModified: true
		});
		props.navigation.goBack();
	};

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.modbusTask,
		isNew,
		hasChanges: () => !!taskRef.current?.isModified,
		save: onDone => commit(taskRef.current, onDone),
		validate: () => ({
			general: isEmpty(taskRef.current?.name),
			configuration: isEmpty(taskRef.current?.config?.address)
		})
	});

	// Only mount the embedded sections once THIS request is actually staged in
	// the scratch slot: react-hook-form seeds its defaultValues once at mount, so
	// mounting against a foreign task would stage its fields back on commit.
	const ready =
		taskRef.current != null &&
		(isNew
			? isTempId(taskRef.current.id)
			: taskRef.current.id === comRequestId);

	return (
		<SettingsScrollView>
			<View style={styles.card}>
				<MenuAccordion
					key={1}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					{ready && (
						<ComRequestGeneralSettingsSection
							key={taskRef.current.id}
							embedded
							comRequestData={taskRef.current}
							showErrors={invalidSections.general}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<MenuAccordion
					key={2}
					name={'Configuration'}
					icon={faSliders}
					invalid={invalidSections.configuration}
					onPress={() => {}}>
					{ready && (
						<ComRequestConfigurationSettingsSection
							key={taskRef.current.id}
							embedded
							comRequestData={taskRef.current}
							showErrors={invalidSections.configuration}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<DeleteItemMenu key={3} OnConfirm={deleteItem} />
			</View>
		</SettingsScrollView>
	);
}

const COLORS = {
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	container: {
		alignSelf: 'stretch'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	}
});

const mapStateToProps = (state: any) => ({
	device: state.root_device.device,
	modbusTask: state.root_modbus_task.modbusTask
});

export default connect(mapStateToProps, {
	updateModbusTask,
	updateDevice
})(ComRequestSettingsScreen);
