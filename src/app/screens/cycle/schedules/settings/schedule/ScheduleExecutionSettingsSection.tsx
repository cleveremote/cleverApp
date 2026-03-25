import React, {useEffect} from 'react';
import {Alert, ScrollView, Switch, Text, View} from 'react-native';
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

export function ScheduleExecutionSettingsSection(props: any) {
	const defValues = {...props.route.params?.scheduleData};
	const getTimeString = (dateValue: number) => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return new Date(date.getTime() + dateValue);
	};
	const defaultValues = {
		pattern: defValues.cron?.pattern,
		date: defValues.cron?.date,
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

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateSchedule({
				...mappingtoDto(data),
				isModified: saveUnchangedData
			});
		}
	};

	const mappingtoDto = (data: any) => {
		const result = {...defValues};
		if (pattern) {
			result.cron = {pattern: data.pattern, date: null};
		} else {
			result.cron = {
				...result.cron,
				date: data.date.toString(),
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

	const validateCronExpression = (pattern: string) => {
		return (
			isValidCron(pattern, {seconds: true}) || 'Invalid cron expression'
		);
	};

	useEffect(() => {
		const subscribe = () => {
			const unsubscribe = props.navigation.addListener(
				'beforeRemove',
				(e: any) => {
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
										onPress: () => {
											unsubscribe();
											subscribe();
										}
									},
									{
										text: 'Discard',
										style: 'destructive',
										onPress: () => {
											reset();
											const data = getValues();
											setPattern(!!data.pattern);
											setSunState(!!data.sunState);
											unsubscribe();
											subscribe();
										}
									}
								]
							);
						}
					)();
				}
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
				<View
					style={{
						flexDirection: 'row',
						marginLeft: 20,
						marginTop: 8,
						marginBottom: 8
					}}>
					<Switch
						value={pattern}
						trackColor={{true: '#32404e', false: '#767577'}}
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
					<Text
						style={{
							marginTop: 5,
							color: '#32404e',
							fontSize: 15,
							marginLeft: 5,
							fontWeight: 'bold'
						}}>
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

				<View
					style={{
						flexDirection: 'row',
						marginLeft: 20,
						marginTop: 8,
						marginBottom: 8
					}}>
					<Switch
						value={sunState}
						trackColor={{true: '#32404e', false: '#767577'}}
						onValueChange={checked => {
							setSunState(checked);
							if (checked) {
								setValue(
									'after',
									new Date(new Date().setHours(0, 0, 0, 0)),
									{
										shouldValidate: true
									}
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
									{
										shouldValidate: true
									}
								);
							}

							setSaveUnchangedData(true);
						}}
					/>
					<Text
						style={{
							marginTop: 5,
							color: '#32404e',
							fontSize: 15,
							marginLeft: 5,
							fontWeight: 'bold'
						}}>
						Trigger based on (sun-state/delay){' '}
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
							onValueChange={value => {
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

export default connect(null, {
	updateSchedule
})(ScheduleExecutionSettingsSection);
