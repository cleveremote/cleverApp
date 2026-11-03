import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	InputForm,
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
import {updateSchedule} from '../../../../../../module/process/infrasctructure/store/actions/schedule';
import i18n from 'i18next';

interface ScheduleGeneralFormData {
	id?: string;
	cycleId?: string;
	name?: string;
	description?: string;
	isPaused?: boolean;
	shouldConfirmation?: boolean;
	isModified?: boolean;
}

interface ScheduleGeneralSettingsSectionProps {
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
			scheduleData?: ScheduleGeneralFormData;
		};
	};
	updateSchedule: (
		schedule: ScheduleGeneralFormData & {isModified: boolean}
	) => void;
}

export function ScheduleGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.scheduleData
		: props.route.params?.scheduleData;
	const parentRef = React.useRef(props.scheduleData);
	parentRef.current = props.scheduleData;

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
			props.updateSchedule({
				...parentRef.current,
				name: data.name,
				description: data.description,
				isModified: true
			})
	});

	const onSubmit = (data: ScheduleGeneralFormData) => {
		if (saveUnchangedData) {
			props.updateSchedule({...data, isModified: saveUnchangedData});
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
					placeholder={i18n.t('common:form.name')}
					rules={{required: i18n.t('common:form.nameRequired')}}
					onChangeText={() => {
						setSaveUnchangedData(true);
					}}
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder={i18n.t('common:form.description')}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</Body>
	);
}

export default connect(null, {
	updateSchedule
})(ScheduleGeneralSettingsSection);
