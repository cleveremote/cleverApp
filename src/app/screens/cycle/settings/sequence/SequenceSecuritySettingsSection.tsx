import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {useForm} from 'react-hook-form';
import {
	InputForm,
	SelectForm,
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
	const [vfd, setVfd] = React.useState(defaultValues.vfd);
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

	const getModbusTasks = () => {
		return props.modbusTasks.map((x: any) => ({
			label: x.label,
			value: x.id
		}));
	};

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={BoxFormStyle.boxForm}>
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
			</View>
			<View style={BoxFormStyle.boxForm}>
				<SelectForm
					lstData={getModbusTasks()}
					control={control}
					errors={errors}
					name="taskId"
					placeholder="tasks"
					rules={{required: false}}
					onValueChange={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<SliderForm
					control={control}
					errors={errors}
					name="vfd"
					placeholder={`VFD speed* → ${vfd} %`}
					rules={{required: true}}
					onChangeText={value => {
						setSaveUnchangedData(true);
						setVfd(value);
					}}
				/>
			</View>
		</ScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {
	updateSequence
})(SequenceSecuritySettingsSection);
