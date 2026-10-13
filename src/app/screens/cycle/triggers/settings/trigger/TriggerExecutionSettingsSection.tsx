import React, {useEffect, useRef, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {AppSwitch} from '../../../../../components/common/AppSwitch';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import {
	DateTimePickerForm,
	SelectForm
} from '../../../../../components/common/FormComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../../../components/common/useSectionSettingsHeader';
import {updateTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {connect} from 'react-redux';

const SWITCH_TRACK_COLOR = {true: '#32404e', false: '#d1d1d6'};

export function TriggerExecutionSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const parentRef = useRef(props.triggerData);
	parentRef.current = props.triggerData;
	const defValues = {
		...(embedded ? props.triggerData : props.route.params?.triggerData)
	};
	const getTimeString = (dateValue: number) => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return new Date(date.getTime() + dateValue);
	};
	const defaultValues = {
		action: defValues.action,
		delay: getTimeString(defValues.delay),
		timeAfter: getTimeString(defValues.trigger?.timeAfter),
		sunState: defValues.trigger?.sunBehavior?.sunState,
		time: getTimeString(defValues.trigger?.sunBehavior?.time)
	};

	const [sunState, setSunState] = useState(
		!!defValues.trigger?.sunBehavior?.sunState
	);
	const sunStateRef = useRef(!!defValues.trigger?.sunBehavior?.sunState);
	const saveUnchangedData = useRef(false);

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue,
		watch,
		getValues,
		trigger
	} = useForm<any>({defaultValues, mode: 'onChange'});

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data => {
			const dto = mappingtoDto(data);
			props.updateTrigger({
				...parentRef.current,
				action: dto.action,
				delay: dto.delay,
				trigger: dto.trigger,
				isModified: true
			});
		}
	});

	const onSubmit = (data: any) => {
		if (saveUnchangedData.current) {
			props.updateTrigger({
				...mappingtoDto(data),
				isModified: saveUnchangedData.current
			});
		}
	};

	const mappingtoDto = (data: any) => {
		const result = {...defValues};
		result.delay = convertToMs(data.delay);
		result.action = data.action;
		if (sunStateRef.current) {
			result.trigger = {
				...result.trigger,
				sunBehavior: {
					sunState: data.sunState,
					time: convertToMs(data.time)
				},
				timeAfter: undefined
			};
		} else {
			result.trigger = {
				...result.trigger,
				timeAfter: convertToMs(data.timeAfter),
				sunBehavior: undefined
			};
		}
		return result;
	};

	const convertToMs = (t: Date) =>
		t.getHours() * 60 * 60 * 1000 + t.getMinutes() * 60 * 1000;

	const buildBeforeRemoveListener = (
		e: EventArg<'beforeRemove', true, {action: NavigationAction}>,
		onContinue: () => void,
		onDiscard: () => void
	) => {
		e.preventDefault();
		handleSubmit(
			data => {
				onSubmit(data);
				props.navigation.dispatch(e.data.action);
			},
			_errors => {
				Alert.alert(
					'Discard changes?',
					'Some fields contain invalid or incomplete information. Would you like to discard changes or continue editing?',
					[
						{
							text: 'Continue',
							style: 'cancel',
							onPress: onContinue
						},
						{
							text: 'Discard',
							style: 'destructive',
							onPress: onDiscard
						}
					]
				);
			}
		)();
	};

	useEffect(() => {
		if (embedded) return;
		const subscribe = () => {
			const unsubscribe = props.navigation.addListener(
				'beforeRemove',
				(e: any) =>
					buildBeforeRemoveListener(
						e,
						() => {
							unsubscribe();
							subscribe();
						},
						() => {
							unsubscribe();
							props.navigation.dispatch(
								e.data.action
							);
						}
					)
			);
			return unsubscribe;
		};

		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.goBack();
					},
					'arrow-alt-circle-left',
					false
				)
		});

		const unsubscribe = subscribe();
		return () => unsubscribe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				<SelectForm
					lstData={[
						{label: 'ON', value: 'ON'},
						{label: 'OFF', value: 'OFF'}
					]}
					control={control}
					errors={errors}
					name="action"
					placeholder="Action*"
					rules={{required: 'Action is required'}}
					onValueChange={() => {
						saveUnchangedData.current = true;
					}}
				/>
				<DateTimePickerForm
					mode={'time'}
					control={control}
					errors={errors}
					name="delay"
					placeholder="Disable trigger for moment"
					rules={{required: 'Delay is required'}}
					onChangeText={() => {
						saveUnchangedData.current = true;
					}}
				/>
				<View style={styles.switchRow}>
					<Text style={styles.switchLabel}>
						Trigger (delay/sun-state)
					</Text>
					<AppSwitch
						value={sunState}
						trackColor={SWITCH_TRACK_COLOR}
						onValueChange={checked => {
							sunStateRef.current = checked;
							setSunState(checked);
							if (checked) {
								setValue(
									'timeAfter',
									new Date(new Date().setHours(0, 0, 0, 0)),
									{shouldValidate: true}
								);
								setValue('sunState', 'SUNRISE', {
									shouldValidate: true
								});
							} else {
								setValue('sunState', null, {
									shouldValidate: true
								});
								setValue(
									'time',
									new Date(new Date().setHours(0, 0, 0, 0)),
									{shouldValidate: true}
								);
							}
							saveUnchangedData.current = true;
						}}
					/>
				</View>
				{sunState ? (
					<>
						<SelectForm
							lstData={[
								{label: 'SUNSET', value: 'SUNSET'},
								{label: 'SUNRISE', value: 'SUNRISE'}
							]}
							control={control}
							errors={errors}
							name="sunState"
							placeholder="Sun state*"
							rules={{required: 'Sun state is required'}}
							onValueChange={() => {
								saveUnchangedData.current = true;
							}}
						/>
						<DateTimePickerForm
							mode={'time'}
							control={control}
							errors={errors}
							name="time"
							placeholder={
								watch('sunState') === 'SUNSET'
									? 'After sunset*'
									: 'Before sunrise*'
							}
							rules={{required: 'Time is required'}}
							onChangeText={() => {
								saveUnchangedData.current = true;
							}}
						/>
					</>
				) : (
					<DateTimePickerForm
						mode={'time'}
						control={control}
						errors={errors}
						name="timeAfter"
						placeholder="Trigger after*"
						rules={{required: 'Time after is required'}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
				)}
			</View>
		</Body>
	);
}

const styles = StyleSheet.create({
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		marginBottom: 8
	},
	switchLabel: {
		flexShrink: 1,
		marginRight: 8,
		color: '#32404e',
		fontSize: 15,
		fontWeight: 'bold'
	}
});

export default connect(null, {
	updateTrigger
})(TriggerExecutionSettingsSection);
