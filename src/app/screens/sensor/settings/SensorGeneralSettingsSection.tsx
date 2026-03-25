import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {
	InputForm,
	SelectColor,
	SelectForm
} from '../../../components/common/FormComponents';
import {connect} from 'react-redux';
import {updateSensor} from '../../../../module/process/infrasctructure/store/actions/sensor';

export function SensorGeneralSettingsSection(props: any) {
	const [sensorData, setSensorData] = React.useState(
		props.route.params?.sensorData
	);
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const defaultValues = {...props.route.params?.sensorData};
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		let style = data.style;
		if (typeof style === 'string') {
			style = JSON.parse(style);
		}
		props.updateSensor({
			...data,
			style: {
				fontColor: style.fontColor,
				iconColor: style.iconColor,
				bgColor: style.bgColor
			},
			isModified: saveUnchangedData
		});
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
	const isScheduled = sensorData?.type === 'SCHEDULED';
	return (
		<View style={BoxFormStyle.boxForm}>
			<SelectColor
				control={control}
				errors={errors}
				name="style"
				placeholder="Sensor theme*"
				rules={{required: 'Theme is required'}}
				style={{...sensorData?.style}}
				onChangeText={value => {
					setSensorData({...sensorData, style: JSON.parse(value)});
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
				<InputForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
				{isScheduled && (
					<>
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
						<InputForm
							control={control}
							errors={errors}
							name="cronPattern"
							placeholder="cron pattern"
							onChangeText={value => {
								setSaveUnchangedData(true);
							}}
						/>
					</>
				)}
				{!isScheduled && (
					<InputForm
						control={control}
						errors={errors}
						name="unit"
						placeholder="Unit"
						disabled={true}
					/>
				)}
			</ScrollView>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {
	updateSensor
})(SensorGeneralSettingsSection);
