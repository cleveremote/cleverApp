import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	InputForm,
	SwitchForm,
	TextAreaForm
} from '../../../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {connect} from 'react-redux';
import {updateTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';

interface TriggerGeneralFormData {
	id?: string;
	cycleId?: string;
	name?: string;
	description?: string;
	isPaused?: boolean;
	shouldConfirmation?: boolean;
	isModified?: boolean;
}

interface TriggerGeneralSettingsSectionProps {
	navigation: {
		dispatch: (action: NavigationAction) => void;
		addListener: (
			event: string,
			callback: (
				e: EventArg<'beforeRemove', true, {action: NavigationAction}>
			) => void
		) => () => void;
		setOptions: (options: object) => void;
		goBack: () => void;
	};
	route: {
		params?: {
			triggerData?: TriggerGeneralFormData;
		};
	};
	updateTrigger: (
		trigger: TriggerGeneralFormData & {isModified: boolean}
	) => void;
}

export function TriggerGeneralSettingsSection(
	props: TriggerGeneralSettingsSectionProps
) {
	const defaultValues = {...props.route.params?.triggerData};
	const [saveUnchangedData, setSaveUnchangedData] = useState(
		defaultValues.isModified
	);

	const {
		control,
		handleSubmit,
		reset,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onBlur'});

	const onSubmit = (data: TriggerGeneralFormData) => {
		if (saveUnchangedData) {
			props.updateTrigger({...data, isModified: saveUnchangedData});
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
				<View style={{flexDirection: 'row', gap: 12}}>
					<SwitchForm
						control={control}
						errors={errors}
						name="isPaused"
						placeholder="Set paused"
						rules={{required: false}}
						onChangeText={() => {
							setSaveUnchangedData(true);
						}}
					/>
					<SwitchForm
						control={control}
						errors={errors}
						name="shouldConfirmation"
						placeholder="Need confirmation"
						rules={{required: false}}
						onChangeText={() => {
							setSaveUnchangedData(true);
						}}
					/>
				</View>
			</View>
		</ScrollView>
	);
}

export default connect(null, {
	updateTrigger
})(TriggerGeneralSettingsSection);
