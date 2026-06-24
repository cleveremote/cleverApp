import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	InputForm,
	TextAreaForm
} from '../../../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import {useForm} from 'react-hook-form';
import {hapticOptions} from '../../../../../data/cycleTypes';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {updateCondition} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {connect} from 'react-redux';

function TriggerConditionGeneralSettingsSection(props: any) {
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

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={BoxFormStyle.boxForm}>
				<InputForm
					control={control}
					errors={errors}
					name="name"
					placeholder="Name*"
					rules={{required: 'Name is required'}}
					onChangeText={() => {
						setSaveUnchangedData(true);
					}}
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={() => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</ScrollView>
	);
}

export default connect(null, {
	updateCondition
})(TriggerConditionGeneralSettingsSection);
