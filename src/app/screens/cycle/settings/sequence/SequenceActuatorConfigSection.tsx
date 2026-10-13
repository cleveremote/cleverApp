import React, {useEffect, useRef} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {connect} from 'react-redux';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {faClock, faSliders} from '@fortawesome/free-solid-svg-icons';
import {updateSequenceModuleConfig} from '../../../../../module/process/infrasctructure/store/actions/module';
import {updateSequence} from '../../../../../module/process/infrasctructure/store/actions/sequence';
import {useForm} from 'react-hook-form';
import {InputForm} from '../../../../components/common/FormComponents';
import {CollapsibleSection} from '../../../../components/common/CollapsibleSection';
import {emptyTimingConfig} from '../../../../../module/process/infrasctructure/store/models/sequenceModule';

// The four timing fields making up a `ModuleTimingConfig`, in display order.
const TIMING_FIELDS: {name: keyof ReturnType<typeof emptyTimingConfig>; label: string}[] = [
	{name: 'waitBeforeExec', label: 'Wait before exec (ms)'},
	{name: 'waitAfterExec', label: 'Wait after exec (ms)'},
	{name: 'waitBeforeExecOff', label: 'Wait before exec off (ms)'},
	{name: 'waitAfterExecOff', label: 'Wait after exec off (ms)'}
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
			customValue: `${moduleConfig?.customValue ?? 0}`
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
			const customConfig = isCtrl
				? {customValue: toNumber(values.customValue)}
				: {};
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
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={BoxFormStyle.boxForm}>
				<CollapsibleSection
					title="Timing Config"
					icon={faClock}
					initiallyExpanded={true}>
					{TIMING_FIELDS.map(field => (
						<InputForm
							key={field.name}
							control={control}
							errors={errors}
							name={field.name}
							placeholder={field.label}
							rules={{required: false}}
							onChangeText={() => {
								isModifiedRef.current = true;
							}}
						/>
					))}
				</CollapsibleSection>
				{isCtrl && (
					<CollapsibleSection title="Custom Value" icon={faSliders}>
						<InputForm
							control={control}
							errors={errors}
							name="customValue"
							placeholder="Custom value"
							rules={{required: false}}
							onChangeText={() => {
								isModifiedRef.current = true;
							}}
						/>
					</CollapsibleSection>
				)}
			</View>
		</ScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	masterActuators: state.root_actuator.actuators,
	moduleConfigs: state.sequence_module.moduleConfigs
});

export default connect(mapStateToProps, {
	updateSequenceModuleConfig,
	updateSequence
})(SequenceActuatorConfigSection);
