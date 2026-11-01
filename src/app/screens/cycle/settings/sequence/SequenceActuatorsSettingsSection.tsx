import React, {useEffect, useRef} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {elementStack} from '../../../../components/cycle/moduleStack';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {connect} from 'react-redux';
import {
	faEthernet,
	faTrash,
	faMicrochip,
	faSliders
} from '@fortawesome/free-solid-svg-icons';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {
	loadSequenceModuleConfigs,
	updateSequenceModuleConfig
} from '../../../../../module/process/infrasctructure/store/actions/module';
import {loadActuators as loadMasterActuators} from '../../../../../module/process/infrasctructure/store/actions/actuator';
import {loadDevices} from '../../../../../module/process/infrasctructure/store/actions/device';
import {loadControlLoops} from '../../../../../module/process/infrasctructure/store/actions/control-loop';
import {enabledLoopOf} from '../../../../data/controlLoopTypes';
import {controlLoopBadge} from '../../../../components/cycle/controlLoopBadge';
import {
	ActuatorType,
	actuatorLabel,
	compareByDeviceAndPort,
	listedRpiActuators
} from '../../../../data/actuatorTypes';
import {useForm} from 'react-hook-form';
import {SelectForm} from '../../../../components/common/FormComponents';
import {CollapsibleSection} from '../../../../components/common/CollapsibleSection';
import {updateSequence} from '../../../../../module/process/infrasctructure/store/actions/sequence';
import {emptyTimingConfig} from '../../../../../module/process/infrasctructure/store/models/sequenceModule';
import {updateSequenceModuleConfig as mergeModuleConfig} from '../../../../../module/process/infrasctructure/store/reducers/module-reducer-helper';

// The three actuator sections rendered as accordions, in order. Adding a new
// actuator type is a single-line change here.
const ACTUATOR_SECTIONS: {
	type: 'RPI' | 'COM' | 'CTRL';
	title: string;
	icon: any;
}[] = [
	{type: 'RPI', title: 'RPI', icon: faMicrochip},
	{type: 'COM', title: 'COM', icon: faEthernet},
	{type: 'CTRL', title: 'CTRL', icon: faSliders}
];

// Rendered either as its own screen (sequence from the route params, changes
// pushed onto the sequence on leave) or embedded in the sequence settings
// accordion (`embedded` + `sequenceData`): there is no leave event then, so each
// change is pushed onto the sequence right away and the sequence settings
// screen persists it with the rest.
export function SequenceActuatorsSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const sequenceData = embedded
		? props.sequenceData
		: props.route.params?.sequenceData;
	const sequenceDataRef = useRef(sequenceData);
	sequenceDataRef.current = sequenceData;
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const moduleConfigsRef = useRef(props.moduleConfigs);
	moduleConfigsRef.current = props.moduleConfigs;
	const saveUnchangedDataRef = useRef(false);
	saveUnchangedDataRef.current =
		saveUnchangedData ||
		!!moduleConfigsRef.current?.find((a: any) => a.isModified);
	const defaultValues = {...sequenceData};
	const {
		control,
		setValue,
		formState: {errors}
	} = useForm<any>({defaultValues});

	// Embedded: merge locally (props.moduleConfigs is stale until re-render) and
	// push the result onto the sequence immediately.
	const changeModuleConfig = (moduleConfig: any) => {
		props.updateSequenceModuleConfig(moduleConfig);
		if (embedded) {
			props.updateSequence({
				...sequenceDataRef.current,
				moduleConfigs: mergeModuleConfig(
					moduleConfigsRef.current || [],
					moduleConfig
				),
				isModified: true
			});
		}
	};

	const addModuleConfig = (actuator: any) => {
		// `delete: false` explicitly: re-adding an actuator removed earlier merges
		// onto its existing entry, which would otherwise keep `delete: true`.
		changeModuleConfig({
			moduleId: actuator.id,
			name: actuator.name,
			type: actuator.type,
			configTiming: emptyTimingConfig(),
			delete: false,
			isModified: true
		});
		if (!embedded) _saveSequence(false);
		setSaveUnchangedData(true);
	};

	const deleteModuleConfig = (item: any) => {
		changeModuleConfig({
			moduleId: item.moduleId,
			delete: true,
			isModified: true
		});
		setSaveUnchangedData(true);
	};

	// The master actuator a module ref points at, matched by id. Used to
	// re-hydrate `type`/`name` on reload: persisted `moduleConfigs` only keep
	// `{moduleId, configTiming, customValue}` (see toSequenceModuleRef), so the
	// display metadata must be resolved from the master list.
	const masterOf = (moduleId: any) =>
		(props.masterActuators || []).find(
			(a: any) => `${a.id}` === `${moduleId}`
		);

	// Selected module refs of the given type (excluding the ones flagged for
	// deletion) so we can both render them and keep them out of the picker.
	// `type`/`name` are resolved from the master actuator when the persisted ref
	// no longer carries them. Sorted by device, then by port number.
	const selectedOfType = (type: string) => {
		const byDeviceAndPort = compareByDeviceAndPort(props.devices);
		return (props.moduleConfigs || [])
			.filter((a: any) => !a.delete)
			.map((a: any) => {
				const master = masterOf(a.moduleId);
				return {
					...a,
					type: a.type ?? master?.type,
					name: a.name ?? master?.name,
					label: master
						? actuatorLabel(master, props.devices)
						: a.name
				};
			})
			.filter((a: any) => a.type === type)
			.sort((a: any, b: any) =>
				byDeviceAndPort(
					masterOf(a.moduleId) ?? a,
					masterOf(b.moduleId) ?? b
				)
			);
	};

	// Picker options: master actuators of the given type minus the already
	// selected ones, mapped to `{label, value}` (SelectForm shape), sorted by
	// device then by port number. RPI ones are the same list as My RPI (not
	// deleted).
	const availableOfType = (type: string) => {
		const usedIds = selectedOfType(type).map((a: any) => `${a.moduleId}`);
		const ofType =
			type === ActuatorType.RPI
				? listedRpiActuators(props.masterActuators, props.devices)
				: (props.masterActuators || []).filter(
						(a: any) => a.type === type
				  );
		return ofType
			.filter((a: any) => usedIds.indexOf(`${a.id}`) < 0)
			.sort(compareByDeviceAndPort(props.devices))
			.map((a: any) => ({
				label: actuatorLabel(a, props.devices),
				value: a.id
			}));
	};

	const canAddActuator =
		!props.isModule ||
		!(props.moduleConfigs || []).some((a: any) => !a.delete);
	// MODULE with its actuator defined: only that actuator's section is shown
	// (e.g. a COM one hides RPI and CTRL).
	const visibleSections = canAddActuator
		? ACTUATOR_SECTIONS
		: ACTUATOR_SECTIONS.filter(
				section => selectedOfType(section.type).length > 0
		  );

	useEffect(() => {
		props.loadMasterActuators();
		props.loadDevices();
		props.loadControlLoops();
	}, []);

	// MODULE sequence: it drives a single actuator. Once one is selected no
	// other can be added, and the one it already had when opened can't be
	// removed (one picked in this session can, until saved).
	const lockedModuleIdsRef = useRef<string[]>([]);
	const isLocked = (moduleConfig: any) =>
		!!props.isModule &&
		lockedModuleIdsRef.current.indexOf(`${moduleConfig.moduleId}`) > -1;

	// Embedded, the sequence may still be loading when the accordion mounts:
	// (re)seed the slice once the right sequence is there.
	useEffect(() => {
		lockedModuleIdsRef.current = (
			sequenceDataRef.current?.moduleConfigs || []
		)
			.filter((a: any) => !a.delete)
			.map((a: any) => `${a.moduleId}`);
		props.loadSequenceModuleConfigs(sequenceDataRef.current);
	}, [sequenceData?.id]);

	useEffect(() => {
		if (embedded) return;
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => _saveSequence(),
					'arrow-alt-circle-left',
					false
				)
		});
		setSaveUnchangedData(
			!!props.moduleConfigs?.find((a: any) => a.isModified)
		);
	}, [saveUnchangedData, props.moduleConfigs]);

	const _saveSequence = (isGoBack = true) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (saveUnchangedDataRef.current) {
			props.updateSequence({
				...sequenceDataRef.current,
				moduleConfigs: moduleConfigsRef.current,
				isModified: true
			});
		}
		if (isGoBack) {
			props.navigation.goBack();
		}
	};

	const openModuleConfig = (moduleConfig: any) => {
		props.navigation.navigate('SequenceActuatorConfigSection', {
			sequenceData: sequenceDataRef.current,
			moduleConfig
		});
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				{visibleSections.map(section => (
					<CollapsibleSection
						key={section.type}
						title={section.title}
						icon={section.icon}
						badge={selectedOfType(section.type).length}>
						{selectedOfType(section.type).map((moduleConfig: any) =>
							elementStack(
								{id: moduleConfig.moduleId},
								() => {
									deleteModuleConfig(moduleConfig);
								},
								`${moduleConfig.label}`,
								isLocked(moduleConfig)
									? null
									: {name: faTrash, color: '#E53E3E'},
								undefined,
								() => openModuleConfig(moduleConfig),
								// Vanne régulée (ControlLoop activée).
								section.type === 'CTRL'
									? controlLoopBadge(
											enabledLoopOf(
												props.controlLoops,
												moduleConfig.moduleId
											)
									  )
									: undefined
							)
						)}
						{canAddActuator && (
							<View
								style={{
									justifyContent: 'center',
									alignItems: 'center'
								}}>
								<SelectForm
									lstData={availableOfType(section.type)}
									control={control}
									errors={errors}
									name={`actuator_${section.type}`}
									placeholder={`Select ${section.title} actuator`}
									rules={{required: false}}
									onValueChange={value => {
										const actuator = (
											props.masterActuators || []
										).find(
											(a: any) => `${a.id}` === `${value}`
										);
										if (actuator) {
											addModuleConfig(actuator);
										}
										// Clear the picker so the added actuator
										// doesn't stay shown as selected.
										setValue(`actuator_${section.type}`, null);
									}}
								/>
							</View>
						)}
					</CollapsibleSection>
				))}
			</View>
		</Body>
	);
}

const mapStateToProps = (state: any) => ({
	masterActuators: state.root_actuator.actuators,
	moduleConfigs: state.sequence_module.moduleConfigs,
	devices: state.root_device.devices,
	controlLoops: state.root_control_loop.loops,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	loadMasterActuators,
	loadDevices,
	loadControlLoops,
	loadSequenceModuleConfigs,
	updateSequenceModuleConfig,
	updateSequence
})(SequenceActuatorsSettingsSection);
