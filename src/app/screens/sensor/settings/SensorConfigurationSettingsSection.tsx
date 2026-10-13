import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {useForm} from 'react-hook-form';
import {isValidCron} from 'cron-validator';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {
	InputForm,
	SelectForm,
	SwitchForm
} from '../../../components/common/FormComponents';
import {forcastDataNameOptions} from '../../../data/modbusTypes';
import {connect} from 'react-redux';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../components/common/useSectionSettingsHeader';
import {updateSensor} from '../../../../module/process/infrasctructure/store/actions/sensor';

const typeOptions = [
	{label: 'FORCAST', value: 'FORCAST'},
	{label: 'COM', value: 'COM'},
	{label: 'MASTER_COM', value: 'MASTER_COM'}
];

export function SensorConfigurationSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded ? props.sensorData : props.route.params?.sensorData;
	const parentRef = React.useRef(props.sensorData);
	parentRef.current = props.sensorData;

	const [sensorData, setSensorData] = React.useState(source);
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const [selectedDeviceId, setSelectedDeviceId] = React.useState(
		source?.deviceId
	);
	const defaultValues = {...source};
	const {
		control,
		handleSubmit,
		setValue,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onChange'});

	const watchedType = watch('type');
	const watchedIsChild = watch('isChild');
	const watchedParentId = watch('parentId');
	// Tant qu'aucun type valide n'est choisi, la section reste vide : seuls les
	// champs conditionnés par le type s'affichent une fois la sélection faite.
	const typeSelected = typeOptions.some(o => o.value === watchedType);
	const isForcast = watchedType === 'FORCAST';
	// Le cronPattern est obligatoire pour un FORCAST ou pour un COM non enfant
	// (un enfant COM hérite le cronPattern de son parent).
	const cronRequired = isForcast || (watchedType === 'COM' && !watchedIsChild);

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data =>
			props.updateSensor({
				...parentRef.current,
				type: data.type,
				isChild: data.isChild,
				enabled: data.enabled,
				parentId:
					data.type === 'COM' && data.isChild ? data.parentId : null,
				deviceId: data.deviceId,
				config: {...parentRef.current?.config, ...data.config},
				isModified: true
			})
	});

	const onSubmit = (data: any) => {
		props.updateSensor({
			...source,
			...data,
			parentId:
				data.type === 'COM' && data.isChild ? data.parentId : null,
			isModified: saveUnchangedData
		});
		props.navigation.goBack();
	};

	useEffect(() => {
		if (embedded) return;
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					handleSubmit(onSubmit),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [saveUnchangedData]);

	const parentSensor = (props.sensors || []).find(
		(x: any) => `${x.id}` === `${watchedParentId}`
	);

	// Le backend ne renvoie que le comRequestId : on retrouve le deviceId
	// correspondant dans les modbusTasks pour positionner les deux dropdowns.
	// Un sensor enfant n'a pas de comRequestId propre.
	const comRequestId = source?.config?.comRequestId;
	useEffect(() => {
		if (watchedIsChild || !comRequestId || !(props.modbusTasks || []).length) {
			return;
		}
		const task = props.modbusTasks.find(
			(x: any) => `${x.id}` === `${comRequestId}`
		);
		if (task?.deviceId) {
			setSelectedDeviceId(task.deviceId);
			setValue('deviceId', task.deviceId);
			setValue('config.comRequestId', comRequestId);
		}
	}, [props.modbusTasks, comRequestId, watchedIsChild]);

	// Sensor enfant : le cronPattern est hérité du parent et non modifiable.
	useEffect(() => {
		if (watchedIsChild && parentSensor?.config?.cronPattern) {
			setValue('config.cronPattern', parentSensor.config.cronPattern);
		}
	}, [watchedIsChild, parentSensor]);

	const getParentSensors = () => {
		return (props.sensors || [])
			.filter((x: any) => x.id !== source?.id && !x.delete)
			.map((x: any) => ({
				label: x.name,
				value: x.id
			}));
	};

	const getDevices = () => {
		return (props.devices || []).map((x: any) => ({
			label: x.name || x.label,
			value: x.id
		}));
	};

	const getRequests = () => {
		return (props.modbusTasks || [])
			.filter((x: any) => `${x.deviceId}` === `${selectedDeviceId}`)
			.map((x: any) => ({
				label: x.label || x.name,
				value: x.id
			}));
	};

	const validateCronExpression = (value: string) =>
		!value ||
		isValidCron(value, {seconds: true}) ||
		'Invalid cron expression';

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={BoxFormStyle.boxForm}>
			<Body {...bodyProps}>
				<SelectForm
					lstData={typeOptions}
					control={control}
					errors={errors}
					name="type"
					placeholder="Type*"
					rules={{required: 'Type is required'}}
					onValueChange={value => {
						// FORCAST n'a pas de parent : on réinitialise le toggle
						// enfant et le parentId associé.
						if (value === 'FORCAST') {
							setValue('isChild', false);
							setValue('parentId', null);
						}
						setSaveUnchangedData(true);
					}}
				/>
				{typeSelected && (
					<>
						{!isForcast && (
							<SwitchForm
								control={control}
								errors={errors}
								name="isChild"
								placeholder="Is child"
								onChangeText={value => {
									if (!value) {
										setValue('parentId', null);
									}
									setSaveUnchangedData(true);
								}}
							/>
						)}
						{watchedType === 'COM' && watchedIsChild && (
							<SelectForm
								lstData={getParentSensors()}
								control={control}
								errors={errors}
								name="parentId"
								placeholder="Parent sensor*"
								rules={{required: 'Parent sensor is required'}}
								onValueChange={value => {
									setSaveUnchangedData(true);
								}}
							/>
						)}
						{isForcast ? (
							<>
								<InputForm
									control={control}
									errors={errors}
									name="config.cronPattern"
									placeholder="Cron pattern*"
									rules={{
										required: 'Cron pattern is required',
										validate: validateCronExpression
									}}
									onChangeText={value => {
										setSaveUnchangedData(true);
									}}
								/>
								<SelectForm
									lstData={forcastDataNameOptions}
									control={control}
									errors={errors}
									name="config.forcastDataName"
									placeholder="Forecast data*"
									rules={{required: 'Forecast data is required'}}
									onValueChange={value => {
										setSaveUnchangedData(true);
									}}
								/>
							</>
						) : (
							<>
								{!watchedIsChild && (
									<>
										<SelectForm
											lstData={getDevices()}
											control={control}
											errors={errors}
											name="deviceId"
											placeholder="Device"
											rules={{required: false}}
											onValueChange={value => {
												setSelectedDeviceId(value);
												setValue('requestId', '');
												setSensorData({
													...sensorData,
													deviceId: value,
													requestId: ''
												});
												setSaveUnchangedData(true);
											}}
										/>
										<SelectForm
											lstData={getRequests()}
											control={control}
											errors={errors}
											name="config.comRequestId"
											placeholder="Request"
											rules={{required: false}}
											onValueChange={value => {
												setSaveUnchangedData(true);
											}}
										/>
									</>
								)}
								<InputForm
									control={control}
									errors={errors}
									name="config.cronPattern"
									placeholder={
										cronRequired
											? 'Cron pattern*'
											: 'Cron pattern'
									}
									disabled={watchedIsChild}
									rules={{
										required: cronRequired
											? 'Cron pattern is required'
											: false,
										validate: validateCronExpression
									}}
									onChangeText={value => {
										setSaveUnchangedData(true);
									}}
								/>
								{watchedIsChild && (
									<InputForm
										control={control}
										errors={errors}
										name="config.code"
										placeholder="Code"
										keyboardType="numeric"
										onChangeText={value => {
											setSaveUnchangedData(true);
										}}
									/>
								)}
								<InputForm
									control={control}
									errors={errors}
									name="config.scale"
									placeholder="Scale"
									keyboardType="numeric"
									onChangeText={value => {
										setSaveUnchangedData(true);
									}}
								/>
								<InputForm
									control={control}
									errors={errors}
									name="config.unit"
									placeholder="Unit"
									onChangeText={value => {
										setSaveUnchangedData(true);
									}}
								/>
							</>
						)}
						<SwitchForm
							control={control}
							errors={errors}
							name="enabled"
							placeholder="Enabled"
							onChangeText={value => {
								setSaveUnchangedData(true);
							}}
						/>
					</>
				)}
			</Body>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	sensor: state.root_sensor.sensor,
	sensors: state.root_sensor.sensors,
	devices: state.root_device.devices,
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {
	updateSensor
})(SensorConfigurationSettingsSection);
