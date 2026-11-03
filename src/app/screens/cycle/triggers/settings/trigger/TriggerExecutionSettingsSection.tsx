import React, {useEffect, useRef, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {AppSwitch} from '../../../../../components/common/AppSwitch';
import {SolarTriggerFields} from '../../../../../components/common/SolarTriggerFields';
import {WarningBox} from '../../../../../components/common/WarningBox';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import {
	DateTimePickerForm,
	SelectForm,
	SwitchForm
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
import i18n from 'i18next';
import {
	durationToPickerDate,
	pickerDateToDuration
} from '../../../../../../services/time';

const SWITCH_TRACK_COLOR = {true: '#32404e', false: '#d1d1d6'};

// Les anciens triggers n'ont pas de timeDirection : « après le coucher » et
// « avant le lever » étaient implicites.
const defaultTimeDirection = (sunBehavior: any) =>
	sunBehavior?.timeDirection ??
	(sunBehavior?.sunState === 'SUNSET' ? 'AFTER' : 'BEFORE');

export function TriggerExecutionSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const parentRef = useRef(props.triggerData);
	parentRef.current = props.triggerData;
	const defValues = {
		...(embedded ? props.triggerData : props.route.params?.triggerData)
	};
	const defaultValues = {
		action: defValues.action,
		delay: durationToPickerDate(defValues.delay),
		timeAfter: durationToPickerDate(defValues.trigger?.timeAfter),
		sunState: defValues.trigger?.sunBehavior?.sunState,
		timeDirection: defaultTimeDirection(defValues.trigger?.sunBehavior),
		time: durationToPickerDate(defValues.trigger?.sunBehavior?.time),
		isPaused: defValues.isPaused,
		shouldConfirmation: defValues.shouldConfirmation
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
				isPaused: dto.isPaused,
				shouldConfirmation: dto.shouldConfirmation,
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
		result.delay = pickerDateToDuration(data.delay);
		result.action = data.action;
		result.isPaused = data.isPaused;
		result.shouldConfirmation = data.shouldConfirmation;
		if (sunStateRef.current) {
			result.trigger = {
				...result.trigger,
				sunBehavior: {
					sunState: data.sunState,
					timeDirection: data.timeDirection,
					time: pickerDateToDuration(data.time)
				},
				timeAfter: undefined
			};
		} else {
			result.trigger = {
				...result.trigger,
				timeAfter: pickerDateToDuration(data.timeAfter),
				sunBehavior: undefined
			};
		}
		return result;
	};

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
					i18n.t('common:discard.title'),
					i18n.t('common:discard.invalidMessage'),
					[
						{
							text: i18n.t('common:discard.continue'),
							style: 'cancel',
							onPress: onContinue
						},
						{
							text: i18n.t('common:discard.confirm'),
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
					placeholder={i18n.t('cycle:triggers.action')}
					rules={{required: i18n.t('cycle:triggers.actionRequired')}}
					onValueChange={() => {
						saveUnchangedData.current = true;
					}}
				/>
				<DateTimePickerForm
					mode={'time'}
					control={control}
					errors={errors}
					name="delay"
					placeholder={i18n.t('cycle:triggers.disableFor')}
					rules={{required: i18n.t('cycle:triggers.delayRequired')}}
					onChangeText={() => {
						saveUnchangedData.current = true;
					}}
				/>
				<View style={styles.switchRow}>
					<Text style={styles.switchLabel}>
						{i18n.t('cycle:triggers.mode')}
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
								setValue('timeDirection', 'BEFORE', {
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
					<SolarTriggerFields
						value={{
							sunState: watch('sunState') ?? 'SUNRISE',
							timeDirection: watch('timeDirection') ?? 'BEFORE',
							time: watch('time') ? pickerDateToDuration(watch('time')) : 0
						}}
						onChange={patch => {
							if (patch.sunState)
								setValue('sunState', patch.sunState, {shouldValidate: true});
							if (patch.timeDirection)
								setValue('timeDirection', patch.timeDirection, {
									shouldValidate: true
								});
							if (patch.time !== undefined)
								setValue('time', durationToPickerDate(patch.time), {
									shouldValidate: true
								});
							saveUnchangedData.current = true;
						}}
					/>
				) : (
					<DateTimePickerForm
						mode={'time'}
						control={control}
						errors={errors}
						name="timeAfter"
						placeholder={i18n.t('cycle:triggers.after')}
						rules={{required: i18n.t('cycle:triggers.afterRequired')}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
				)}
				<WarningBox hideIcon style={styles.warning}>
					<SwitchForm
						control={control}
						errors={errors}
						name="isPaused"
						placeholder={i18n.t('cycle:schedules.setPaused')}
						rules={{required: false}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
					<SwitchForm
						control={control}
						errors={errors}
						name="shouldConfirmation"
						placeholder={i18n.t('cycle:schedules.needConfirmation')}
						rules={{required: false}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
				</WarningBox>
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
	},
	warning: {
		marginTop: 8
	}
});

export default connect(null, {
	updateTrigger
})(TriggerExecutionSettingsSection);
