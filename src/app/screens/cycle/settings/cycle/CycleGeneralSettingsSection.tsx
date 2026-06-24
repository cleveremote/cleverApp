import React, {useEffect} from 'react';
import {Alert, ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {
	InputForm,
	SelectColor,
	TextAreaForm
} from '../../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';

import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {EventArg, NavigationAction} from '@react-navigation/native';

export function CycleGeneralSettingsSection(props: any) {
	const [cycleData, setCycleData] = React.useState(
		props.route.params?.cycleData
	);
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const defaultValues = {...props.route.params?.cycleData};
	const {
		control,
		handleSubmit,
		reset,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onBlur'});

	const onSubmit = (e: any, data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		let style = data.style;
		if (typeof style === 'string') {
			style = JSON.parse(style);
		}
		if (saveUnchangedData) {
			props.updateCycle(
				{
					...data,
					style: {
						fontColor: style.fontColor,
						iconColor: style.iconColor,
						bgColor: style.bgColor
					},
					isModified: saveUnchangedData
				},
				() => {
					props.navigation.dispatch(e.data.action);
				}
			);
		}
	};
	const buildBeforeRemoveListener = (
		e: EventArg<'beforeRemove', true, {action: NavigationAction}>,
		onContinue: () => void,
		onDiscard: () => void
	) => {
		const backActions = ['GO_BACK', 'POP', 'POP_TO_TOP'];
		if (!backActions.includes(e.data.action.type)) {
			return;
		}
		e.preventDefault();
		handleSubmit(
			data => {
				onSubmit(e, data);
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
		<View style={BoxFormStyle.boxForm}>
			<SelectColor
				control={control}
				errors={errors}
				name="style"
				placeholder="Cycle theme*"
				rules={{required: 'Theme is required'}}
				style={{...cycleData?.style}}
				onChangeText={value => {
					setCycleData({...cycleData, style: JSON.parse(value)});
					setSaveUnchangedData(true);
				}}
			/>
			<ScrollView automaticallyAdjustKeyboardInsets={true}>
				<InputForm
					control={control}
					errors={errors}
					name="name"
					placeholder="Name*"
					rules={{required: 'Name is required'}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</ScrollView>
		</View>
	);
}

export default connect(null, {
	updateCycle
})(CycleGeneralSettingsSection);
