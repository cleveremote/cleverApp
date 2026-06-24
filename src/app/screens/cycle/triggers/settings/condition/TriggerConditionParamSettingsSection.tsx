import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {updateCondition} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {
	InputForm,
	SelectForm
} from '../../../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';

export function TriggerConditionParamSettingsSection(props: any) {
	const defaultValues = {...props.route.params?.conditionData};
	const [saveUnchangedData, setSaveUnchangedData] = useState(
		defaultValues.isModified
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateCondition({...data, isModified: saveUnchangedData});
		}
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

	const getDevices = () => {
		const cycles = props.cycles.map((x: any) => ({
			label: x.name,
			value: x.id
		}));
		const sensors = props.sensors.map((x: any) => ({
			label: x.name,
			value: x.id
		}));
		return cycles.concat(sensors);
	};

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={BoxFormStyle.boxForm}>
				<SelectForm
					lstData={getDevices()}
					control={control}
					errors={errors}
					name="deviceId"
					placeholder="Sensors/Cycles"
					rules={{required: 'Device is required'}}
					onValueChange={() => {
						setSaveUnchangedData(true);
					}}
				/>
				<SelectForm
					lstData={[
						{label: '<', value: '<'},
						{label: '>', value: '>'},
						{label: '=', value: '='},
						{label: '<=', value: '<='},
						{label: '>=', value: '>='}
					]}
					control={control}
					errors={errors}
					name="operator"
					placeholder="Operator*"
					rules={{required: 'Operator is required'}}
					onValueChange={() => {
						setSaveUnchangedData(true);
					}}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="value"
					placeholder="Value*"
					rules={{required: 'Value is required'}}
					onChangeText={() => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</ScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {updateCondition})(
	TriggerConditionParamSettingsSection
);
