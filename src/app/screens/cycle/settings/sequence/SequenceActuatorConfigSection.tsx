import React, {useEffect, useRef} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {connect} from 'react-redux';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {faClock, faSliders} from '@fortawesome/free-solid-svg-icons';
import {updateSequenceModuleConfig} from '../../../../../module/process/infrasctructure/store/actions/module';
import {updateSequence} from '../../../../../module/process/infrasctructure/store/actions/sequence';
import {useForm} from 'react-hook-form';
import {
	InputForm,
	SwitchForm
} from '../../../../components/common/FormComponents';
import {CollapsibleSection} from '../../../../components/common/CollapsibleSection';
import {KeyboardAwareScrollView} from '../../../../components/common/KeyboardAwareScrollView';
import {emptyTimingConfig} from '../../../../../module/process/infrasctructure/store/models/sequenceModule';
import {loadControlLoops} from '../../../../../module/process/infrasctructure/store/actions/control-loop';
import {enabledLoopOf, isFollowLoop, sensorUnit} from '../../../../data/controlLoopTypes';
import i18n from 'i18next';

// The four timing fields making up a `ModuleTimingConfig`, in display order.
const TIMING_FIELDS: {name: keyof ReturnType<typeof emptyTimingConfig>}[] = [
	{name: 'waitBeforeExec'},
	{name: 'waitAfterExec'},
	{name: 'waitBeforeExecOff'},
	{name: 'waitAfterExecOff'}
];

// Parse a form value into a number, defaulting to 0 for empty/invalid input.
const toNumber = (value: any) => {
	const parsed = Number(`${value ?? ''}`.replace(/[^0-9.-]/g, ''));
	return Number.isNaN(parsed) ? 0 : parsed;
};

export function SequenceActuatorConfigSection(props: any) {
	const moduleConfig = props.route.params?.moduleConfig;
	const timing = {...emptyTimingConfig(), ...moduleConfig?.configTiming};
	// Only CTRL actuators carry a custom value; the type comes with the module
	// ref when it was resolved by the list screen, else from the master actuator.
	const master = (props.masterActuators || []).find(
		(a: any) => `${a.id}` === `${moduleConfig?.moduleId}`
	);
	const isCtrl = (moduleConfig?.type ?? master?.type) === 'CTRL';
	// Vanne régulée : la box ignore la valeur (seul compte qu'elle soit ≠ 0) et
	// régule jusqu'à la consigne de sa boucle. Sinon la valeur est l'ouverture %.
	const loop = isCtrl
		? enabledLoopOf(props.controlLoops, moduleConfig?.moduleId)
		: undefined;
	const loopSensor = (props.sensors || []).find(
		(s: any) => `${s.id}` === `${loop?.sensorId}`
	);
	const unit = sensorUnit(loopSensor) ? ` ${sensorUnit(loopSensor)}` : '';
	const loopTarget = !loop
		? ''
		: isFollowLoop(loop)
		? i18n.t('cycle:sequence.follows', {
				sensor: loopSensor?.name ?? i18n.t('cycle:sequence.analogInput'),
				min: loop.follow?.inputMin ?? 0,
				max: loop.follow?.inputMax ?? 100,
				unit
		  })
		: i18n.t('cycle:sequence.regulates', {
				setpoint: loop.setpoint ?? '?',
				unit,
				sensor: loopSensor?.name ? ` (${loopSensor.name})` : ''
		  });
	const isModifiedRef = useRef(false);
	const {
		control,
		getValues,
		formState: {errors}
	} = useForm<any>({
		defaultValues: {
			waitBeforeExec: `${timing.waitBeforeExec}`,
			waitAfterExec: `${timing.waitAfterExec}`,
			waitBeforeExecOff: `${timing.waitBeforeExecOff}`,
			waitAfterExecOff: `${timing.waitAfterExecOff}`,
			customValue: `${moduleConfig?.customValue ?? 0}`,
			// Sans valeur posée, une vanne régulée est lancée par défaut.
			runRegulation:
				moduleConfig?.customValue == null ||
				Number(moduleConfig.customValue) !== 0
		}
	});

	const _save = (isGoBack = true) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (isModifiedRef.current) {
			const values = getValues();
			const configTiming = {
				waitBeforeExec: toNumber(values.waitBeforeExec),
				waitAfterExec: toNumber(values.waitAfterExec),
				waitBeforeExecOff: toNumber(values.waitBeforeExecOff),
				waitAfterExecOff: toNumber(values.waitAfterExecOff)
			};
			const customConfig = !isCtrl
				? {}
				: loop
				? {customValue: values.runRegulation ? 1 : 0}
				: {customValue: toNumber(values.customValue)};
			props.updateSequenceModuleConfig({
				moduleId: moduleConfig?.moduleId,
				configTiming,
				...customConfig,
				isModified: true
			});
			// Merge locally so the persisted sequence reflects this config change
			// immediately (props.moduleConfigs is stale until re-render).
			const updated = (props.moduleConfigs || []).map((a: any) =>
				a.moduleId === moduleConfig?.moduleId
					? {...a, configTiming, ...customConfig, isModified: true}
					: a
			);
			props.updateSequence({
				...props.route.params?.sequenceData,
				moduleConfigs: updated,
				isModified: true
			});
		}
		if (isGoBack) {
			props.navigation.goBack();
		}
	};

	useEffect(() => {
		if (isCtrl) props.loadControlLoops();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => _save(),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [props.moduleConfigs]);

	return (
		<KeyboardAwareScrollView>
			<View style={BoxFormStyle.boxForm}>
				<CollapsibleSection
					title={i18n.t('cycle:sequence.timingConfig')}
					icon={faClock}
					initiallyExpanded={true}>
					{TIMING_FIELDS.map(field => (
						<InputForm
							key={field.name}
							control={control}
							errors={errors}
							name={field.name}
							placeholder={i18n.t(`cycle:sequence.timing.${field.name}`)}
							rules={{required: false}}
							onChangeText={() => {
								isModifiedRef.current = true;
							}}
						/>
					))}
				</CollapsibleSection>
				{isCtrl && loop && (
					<CollapsibleSection
						title={i18n.t('cycle:controlLoop.regulation')}
						icon={faSliders}
						initiallyExpanded={true}>
						<SwitchForm
							control={control}
							errors={errors}
							name="runRegulation"
							placeholder={i18n.t('cycle:sequence.runRegulation')}
							onChangeText={() => {
								isModifiedRef.current = true;
							}}
						/>
						<Text style={styles.hint}>
							{loopTarget}
						</Text>
					</CollapsibleSection>
				)}
				{isCtrl && !loop && (
					<CollapsibleSection
						title={i18n.t('cycle:sequence.opening')}
						icon={faSliders}
						initiallyExpanded={true}>
						<InputForm
							control={control}
							errors={errors}
							name="customValue"
							placeholder={i18n.t('cycle:sequence.openingRange', {
								min: master?.config?.minOpening ?? 0,
								max: master?.config?.maxOpening ?? 100
							})}
							keyboardType="numeric"
							rules={{required: false}}
							onChangeText={() => {
								isModifiedRef.current = true;
							}}
						/>
					</CollapsibleSection>
				)}
			</View>
		</KeyboardAwareScrollView>
	);
}

const styles = StyleSheet.create({
	hint: {
		color: '#8a96a3',
		fontSize: 13,
		marginTop: 8
	}
});

const mapStateToProps = (state: any) => ({
	masterActuators: state.root_actuator.actuators,
	moduleConfigs: state.sequence_module.moduleConfigs,
	controlLoops: state.root_control_loop.loops,
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, {
	updateSequenceModuleConfig,
	updateSequence,
	loadControlLoops
})(SequenceActuatorConfigSection);
