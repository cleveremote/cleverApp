import React, {useEffect} from 'react';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {AppSwitch} from '../../../../../components/common/AppSwitch';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	DateTimePickerForm,
	InputForm,
	SelectForm
} from '../../../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {connect} from 'react-redux';
import {updateSchedule} from '../../../../../../module/process/infrasctructure/store/actions/schedule';
import {isValidCron} from 'cron-validator';

const SWITCH_TRACK_COLOR = {true: '#32404e', false: '#d1d1d6'};

export function ScheduleExecutionSettingsSection(props: any) {
	const defValues = {...props.route.params?.scheduleData};
	const getTimeString = (dateValue: number) => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return new Date(date.getTime() + dateValue);
	};
	const defaultValues = {
		pattern: defValues.cron?.pattern,
		date:
			defValues.cron?.date != null
				? new Date(defValues.cron.date)
				: new Date(),
		after: getTimeString(defValues.cron?.after),
		sunState: defValues.cron?.sunBehavior?.sunState,
		time: getTimeString(defValues.cron?.sunBehavior?.time)
	};

	const [sunState, setSunState] = React.useState(
		!!defValues.cron?.sunBehavior?.sunState
	);
	const [pattern, setPattern] = React.useState(!!defValues.cron?.pattern);

	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);

	const {
		control,
		formState: {errors},
		handleSubmit,
		setValue,
		getValues,
		register,
		reset
	} = useForm({defaultValues, mode: 'onBlur'});

	const onSubmit = (data: any, e: any) => {
		if (!saveUnchangedData) props.navigation.dispatch(e.data.action);
		props.updateSchedule(
			{
				...mappingtoDto(data),
				isModified: saveUnchangedData
			},
			() => {
				props.navigation.dispatch(e.data.action);
			}
		);
	};

	const mappingtoDto = (data: any) => {
		const result = {...defValues};
		if (pattern) {
			result.cron = {pattern: data.pattern, date: null};
		} else {
			result.cron = {
				...result.cron,
				date:
					data.date instanceof Date ? data.date.getTime() : data.date,
				pattern: null
			};
		}

		if (sunState) {
			result.cron = {
				...result.cron,
				sunBehavior: {
					sunState: data.sunState,
					time: convertToMs(data.time)
				},
				after: undefined
			};
		} else {
			result.cron = {
				...result.cron,
				after: convertToMs(data.after),
				sunBehavior: undefined
			};
		}
		return result;
	};

	const convertToMs = (t: Date) =>
		t.getHours() * 60 * 60 * 1000 + t.getMinutes() * 60 * 1000;

	const validateCronExpression = (value: string) =>
		isValidCron(value, {seconds: true}) || 'Invalid cron expression';

	const buildBeforeRemoveListener = (
		e: EventArg<'beforeRemove', true, {action: NavigationAction}>,
		onContinue: () => void,
		onDiscard: () => void
	) => {
		e.preventDefault();
		handleSubmit(
			data => {
				onSubmit(data, e);
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
							reset();
							const data = getValues();
							setPattern(!!data.pattern);
							setSunState(!!data.sunState);
							unsubscribe();
							subscribe();
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
	}, [saveUnchangedData]);

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={BoxFormStyle.boxForm}>
				<View style={styles.switchRow}>
					<AppSwitch
						value={pattern}
						trackColor={SWITCH_TRACK_COLOR}
						onValueChange={checked => {
							setPattern(checked);
							if (checked) {
								setValue('pattern', '*/30 * * * *', {
									shouldValidate: true
								});
							} else {
								setValue('date', new Date(), {
									shouldValidate: true
								});
								setValue('pattern', null, {
									shouldValidate: true
								});
							}
							setSaveUnchangedData(true);
						}}
					/>
					<Text style={styles.switchLabel}>
						Schedule by Date/Pattern
					</Text>
				</View>
				{pattern ? (
					<InputForm
						control={control}
						errors={errors}
						name="pattern"
						placeholder="Pattern*"
						rules={{required: 'pattern is required'}}
						refr={register('pattern', {
							validate: validateCronExpression
						})}
						onChangeText={value => {
							setSaveUnchangedData(true);
						}}
					/>
				) : (
					<DateTimePickerForm
						mode={'datetime'}
						control={control}
						errors={errors}
						name="date"
						placeholder="Date*"
						minimumDate={new Date()}
						rules={{required: 'date is required'}}
						onChangeText={value => {
							setSaveUnchangedData(true);
						}}
					/>
				)}

				<View style={styles.switchRow}>
					<AppSwitch
						value={sunState}
						trackColor={SWITCH_TRACK_COLOR}
						onValueChange={checked => {
							setSunState(checked);
							if (checked) {
								setValue(
									'after',
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
							setSaveUnchangedData(true);
						}}
					/>
					<Text style={styles.switchLabel}>
						Trigger based on (sun-state/delay)
					</Text>
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
							placeholder="SunState*"
							rules={{required: 'sun state is required'}}
							onValueChange={() => {
								setSaveUnchangedData(true);
							}}
						/>
						<DateTimePickerForm
							mode={'time'}
							control={control}
							errors={errors}
							name="time"
							placeholder="After sunset / Before sunrise*"
							rules={{required: 'time is required'}}
							onChangeText={() => {
								setSaveUnchangedData(true);
							}}
						/>
					</>
				) : (
					<DateTimePickerForm
						mode={'time'}
						control={control}
						errors={errors}
						name="after"
						placeholder="Trigger after*"
						rules={{required: 'after is required'}}
						onChangeText={() => {
							setSaveUnchangedData(true);
						}}
					/>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	switchRow: {
		flexDirection: 'row',
		marginLeft: 20,
		marginTop: 8,
		marginBottom: 8
	},
	switchLabel: {
		marginTop: 5,
		color: '#32404e',
		fontSize: 15,
		marginLeft: 5,
		fontWeight: 'bold'
	}
});

export default connect(null, {
	updateSchedule
})(ScheduleExecutionSettingsSection);
