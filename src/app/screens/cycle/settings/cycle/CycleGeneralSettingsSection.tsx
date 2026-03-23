import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
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

export function CycleGeneralSettingsSection(props: any) {
	const [cycleData, setCycleData] = React.useState(
		props.route.params?.cycleData
	);
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const isSavingRef = React.useRef(false);
	const defaultValues = {...props.route.params?.cycleData};
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		let style = data.style;
		if (typeof style === 'string') {
			style = JSON.parse(style);
		}
		if (saveUnchangedData) {
			props.updateCycle({
				...data,
				style: {
					fontColor: style.fontColor,
					iconColor: style.iconColor,
					bgColor: style.bgColor
				},
				isModified: saveUnchangedData
			});
		}
	};
	const onSubmitGoBack = (data: any) => {
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
		<View style={BoxFormStyle.boxForm}>
			<SelectColor
				control={control}
				errors={errors}
				name="style"
				placeholder="Cycle theme*"
				rules={{required: true}}
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
					rules={{required: true}}
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
const mapStateToProps = (state: any) => ({
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	updateCycle
})(CycleGeneralSettingsSection);
