import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {
	GeneralSettingsFields,
	generalEmbeddedBoxStyle
} from '../../../components/common/GeneralSettingsFields';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {useForm} from 'react-hook-form';
import {hapticOptions} from '../../../data/cycleTypes';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../components/common/useSectionSettingsHeader';
import {updateCondition} from '../../../../module/process/infrasctructure/store/actions/condition';
import {connect} from 'react-redux';
import i18n from 'i18next';

function ConditionGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.conditionData
		: props.route.params?.conditionData;
	const parentRef = React.useRef(props.conditionData);
	parentRef.current = props.conditionData;

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
	} = useForm({defaultValues, mode: 'onChange'});

	// Écran autonome : validation immédiate si ouvert depuis un état « not valid ».
	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data =>
			props.updateCondition({
				...parentRef.current,
				name: data.name,
				description: data.description,
				isModified: true
			})
	});

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
			<View style={[BoxFormStyle.boxForm, embedded && generalEmbeddedBoxStyle]}>
				<GeneralSettingsFields
					control={control}
					errors={errors}
					showErrors={props.showErrors}
					nameMaxLength={25}
					onEdit={() => setSaveUnchangedData(true)}
				/>
			</View>
		</Body>
	);
}

export default connect(null, {
	updateCondition
})(ConditionGeneralSettingsSection);
