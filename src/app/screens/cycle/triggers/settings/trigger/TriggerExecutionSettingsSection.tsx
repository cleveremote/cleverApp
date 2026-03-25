import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {AppSwitch} from '../../../../../components/common/AppSwitch';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import {
	DateTimePickerForm,
	SelectForm
} from '../../../../../components/common/FormComponents';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {updateTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {connect} from 'react-redux';

function TriggerExecutionSettingsSection(props: any) {
	const defValues = {...props.route.params?.triggerData};
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

	const sunStatusRef = useRef(!!defValues.trigger?.sunBehavior?.sunState);
	const [saveUnchangedData, setSaveUnchangedData] = useState(false);
	const isSavingRef = React.useRef(false);

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateTrigger({
				...mappingtoDto(data),
				isModified: saveUnchangedData
			});
		}
	};

	const onSubmitGoBack = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		onSubmit(data);
		props.navigation.goBack();
	};

	const mappingtoDto = (data: any) => {
		const result = {...defValues};
		result.delay = convertToMs(data.delay);
		result.action = data.action;
		if (sunStatusRef.current) {
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

	const convertToMs = (t: Date) => {
		const time = t.toLocaleTimeString();
		const ms =
			Number(time.split(':')[0]) * 60 * 60 * 1000 +
			Number(time.split(':')[1]) * 60 * 1000;
		return ms;
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					handleSubmit(onSubmitGoBack),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [saveUnchangedData]);

	useEffect(() => {
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				if (isSavingRef.current) return;
				e.preventDefault();
				isSavingRef.current = true;
				handleSubmit(data => {
					onSubmit(data);
					props.navigation.dispatch(e.data.action);
				})();
			}
		);
		return () => listenerUnsubscribe();
	}, [saveUnchangedData]);

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
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
					onValueChange={value => {
						setSaveUnchangedData(true);
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
						setSaveUnchangedData(true);
					}}
				/>

				<View
					style={{
						flexDirection: 'row',
						marginLeft: 20,
						marginTop: 8,
						marginBottom: 8
					}}>
					<AppSwitch
						value={!!sunStatusRef.current}
						onValueChange={checked => {
							sunStatusRef.current = !!checked;
							if (checked) {
								setValue('timeAfter', new Date(), {
									shouldValidate: true
								});
							} else {
								setValue('sunState', null, {
									shouldValidate: true
								});
								setValue('time', new Date(), {
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
						Trigger based on (sun-state/delay){' '}
					</Text>
				</View>
				{sunStatusRef.current ? (
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
							rules={{required: 'Time is required'}}
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
						name="timeAfter"
						placeholder="Trigger after*"
						rules={{required: 'Time after is required'}}
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
	updateTrigger
})(TriggerExecutionSettingsSection);
