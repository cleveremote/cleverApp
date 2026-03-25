import React, {useEffect, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {connect} from 'react-redux';
import {updateTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {
	InputForm,
	SwitchForm,
	TextAreaForm
} from '../../../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';

export function TriggerGeneralSettingsSection(props: any) {
	const defaultValues = {...props.route.params?.triggerData};
	const [saveUnchangedData, setSaveUnchangedData] = useState(
		defaultValues.isModified
	);
	const isSavingRef = React.useRef(false);

	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateTrigger({...data, isModified: saveUnchangedData});
		}
	};

	const onSubmitGoBack = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		onSubmit(data);
		props.navigation.goBack();
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
				<View style={{flexDirection: 'row', gap: 12}}>
					<SwitchForm
						control={control}
						errors={errors}
						name="isPaused"
						placeholder="Set paused"
						rules={{required: false}}
						onChangeText={value => {
							setSaveUnchangedData(true);
						}}
					/>
					<SwitchForm
						control={control}
						errors={errors}
						name="shouldConfirmation"
						placeholder="Need confirmation"
						rules={{required: false}}
						onChangeText={value => {
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
