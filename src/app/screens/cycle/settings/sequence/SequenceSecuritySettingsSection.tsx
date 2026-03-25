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
	const isSavingRef = React.useRef(false);
	const defaultValues = {...props.route.params?.sequenceData};
	const [vfd, setVfd] = React.useState(defaultValues.vfd);
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateSequence({
				...data,
				maxDuration: Number(data.maxDuration),
				vfd: Number(data.vfd),
				isModified: saveUnchangedData
			});
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
					rules={{required: 'Security is required'}}
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
					rules={{required: 'VFD speed is required'}}
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
