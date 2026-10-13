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
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../../../components/common/useSectionSettingsHeader';
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

export function TriggerGeneralSettingsSection(props: any) {
	// Mode embarqué : rendu inline dans l'écran de réglages du trigger.
	const embedded = !!props.embedded;
	const source = embedded
		? props.triggerData
		: props.route.params?.triggerData;
	const parentRef = React.useRef(props.triggerData);
	parentRef.current = props.triggerData;

	const defaultValues = {...source};
	const [saveUnchangedData, setSaveUnchangedData] = useState(
		defaultValues.isModified
	);

	const {
		control,
		handleSubmit,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm<any>({defaultValues, mode: 'onChange'});

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data =>
			props.updateTrigger({
				...parentRef.current,
				name: data.name,
				description: data.description,
				isPaused: data.isPaused,
				shouldConfirmation: data.shouldConfirmation,
				isModified: true
			})
	});

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
	}, [saveUnchangedData]);

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={25}
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
		</Body>
	);
}

export default connect(null, {
	updateTrigger
})(TriggerGeneralSettingsSection);
