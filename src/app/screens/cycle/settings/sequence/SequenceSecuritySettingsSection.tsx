import React, {useEffect} from 'react';
import {Box, ScrollView, Slider} from 'native-base';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {useForm} from 'react-hook-form';
import {
	InputForm,
	SliderForm
} from '../../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {updateSequence} from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SequenceSecuritySettingsSection(props: any) {
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const defaultValues = {...props.route.params?.sequenceData};
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (saveUnchangedData) {
			props.updateSequence({
				...data,
				maxDuration: Number(data.maxDuration),
				vfd: Number(data.vfd),
				isModified: saveUnchangedData
			});
		}
		props.navigation.goBack();
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					handleSubmit(onSubmit),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [saveUnchangedData]);

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<Box rounded="xl" style={BoxFormStyle.boxForm}>
				<InputForm
					control={control}
					errors={errors}
					name="maxDuration"
					placeholder="security*"
					rules={{required: true}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</Box>
			<Box rounded="xl" style={BoxFormStyle.boxForm}>
				<SliderForm
					control={control}
					errors={errors}
					name="vfd"
					placeholder="VFD*"
					rules={{required: true}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</Box>
		</ScrollView>
	);
}

export default connect(null, {
	updateSequence
})(SequenceSecuritySettingsSection);
