import React, {useEffect, useState} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {updateCondition} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {
	InputForm,
	SelectForm
} from '../../../../../components/common/FormComponents';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';

export function TriggerConditionParamSettingsSection(props: any) {
	const defaultValues = {...props.route.params?.conditionData};
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
			props.updateCondition({...data, isModified: saveUnchangedData});
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

	const getDevices = () => {
		const cycles = props.cycles.map((x: any) => ({
			label: x.name,
			value: x.id
		}));
		const sensors = props.sensors.map((x: any) => ({
			label: x.name,
			value: x.id
		}));
		const newArray = cycles.concat(sensors);
		return newArray;
	};

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={BoxFormStyle.boxForm}>
				<SelectForm
					lstData={getDevices()}
					control={control}
					errors={errors}
					name="deviceId"
					placeholder="Sensors/Cycles"
					rules={{required: 'Device is required'}}
					onValueChange={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<SelectForm
					lstData={[
						{label: '<', value: '<'},
						{label: '>', value: '>'},
						{label: '=', value: '='},
						{label: '<=', value: '<='},
						{label: '>=', value: '>='}
					]}
					control={control}
					errors={errors}
					name="operator"
					placeholder="Operator*"
					rules={{required: 'Operator is required'}}
					onValueChange={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<InputForm
					control={control}
					errors={errors}
					name="value"
					placeholder="Value*"
					rules={{required: 'Value is required'}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</ScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {updateCondition})(
	TriggerConditionParamSettingsSection
);
