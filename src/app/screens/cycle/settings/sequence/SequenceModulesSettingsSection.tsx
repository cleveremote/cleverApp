import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {elementStack} from '../../../../components/cycle/moduleStack';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {getPorts, hapticOptions} from '../../../../data/cycleTypes';
import {connect} from 'react-redux';
import {faMinus} from '@fortawesome/free-solid-svg-icons';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {
	loadModules,
	updateModule,
	updateDevice
} from '../../../../../module/process/infrasctructure/store/actions/module';
import {useForm} from 'react-hook-form';
import {SelectForm} from '../../../../components/common/FormComponents';
import {updateSequence} from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SequenceModulesSettingsSection(props: any) {
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const modulesRef = useRef(props.modules);
	modulesRef.current = props.modules;
	const devicesRef = useRef(props.devices);
	devicesRef.current = props.devices;
	const isTask = props.cycle?.type === 'TASK';
	const saveUnchangedDataRef = useRef(false);
	saveUnchangedDataRef.current =
		saveUnchangedData ||
		!!modulesRef.current?.find((s: any) => s.isModified) ||
		!!devicesRef.current?.find((s: any) => s.isModified);
	const defaultValues = {...props.route.params?.sequenceData};
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
props.updateModule({portNum: data.modules, isModified: true});
		_saveSequence(false);
		setSaveUnchangedData(true);
	};

	const onSubmitDevice = (data: any) => {
		const device = props.modbusTasks?.find(
			(x: any) => `${x.id}` === `${data.devices}`
		);
		props.updateDevice({
			id: data.devices,
			deviceId: data.devices,
			label: device?.label,
			value: 0,
			isModified: true
		});
		_saveSequence(false);
		setSaveUnchangedData(true);
	};

	const deleteModule = (item: any) => {
		props.updateModule({portNum: 'deleted_' + item.id, isModified: true});
	};

	const deleteDevice = (item: any) => {
		props.updateDevice({id: 'deleted_' + item.id, isModified: true});
	};

	const changeDeviceValue = (item: any, value: string) => {
		props.updateDevice({
			id: item.id,
			value: value.replace(/[^0-9.]/g, ''),
			isModified: true
		});
		setSaveUnchangedData(true);
	};

	// Devices already added (excluding the ones flagged for deletion) are kept
	// out of the selector to avoid duplicates, mirroring the modules/ports list.
	const getDevices = () => {
		const usedIds = (props.devices || [])
			.filter((x: any) => `${x.id}`.indexOf('deleted_') < 0)
			.map((x: any) => `${x.id}`);
		return (props.modbusTasks || [])
			.filter((x: any) => usedIds.indexOf(`${x.id}`) < 0)
			.map((x: any) => ({label: x.label, value: x.id}));
	};

	useEffect(() => {
		props.loadModules(props.route.params?.sequenceData);
	}, []);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => _saveSequence(),
					'arrow-alt-circle-left',
					false
				)
		});
		setSaveUnchangedData(
			!!props.modules.find((s: any) => s.isModified) ||
				!!props.devices?.find((s: any) => s.isModified)
		);
	}, [saveUnchangedData, props.modules, props.devices]);

	const _saveSequence = (isGoBack = true) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
if (saveUnchangedDataRef.current) {
			props.updateSequence({
				...props.route.params?.sequenceData,
				modules: modulesRef.current,
				devices: devicesRef.current,
				isModified: true
			});
		}
		if (isGoBack) {
			props.navigation.goBack();
		}
	};

	return (
		<View style={BoxFormStyle.boxForm}>
			{props.modules.map((module: any) =>
				module.id && module.id.indexOf('deleted_') > -1
					? null
					: elementStack(
							module,
							(item: any) => {
								deleteModule(item);
							},
							`port number ${module.portNum}`,
							{name: faMinus, color: 'red'}
					  )
			)}
			<View style={{justifyContent: 'center', alignItems: 'center'}}>
				<SelectForm
					lstData={getPorts(
						props.modules.map((x: any) => Number(x.portNum))
					)}
					control={control}
					errors={errors}
					name="modules"
					placeholder="Select Port number"
					rules={{required: false}}
					onValueChange={value => {
						handleSubmit(onSubmit)();
					}}
				/>
			</View>

			{isTask ? (
				<>
					{(props.devices || []).map((device: any) =>
						`${device.id}`.indexOf('deleted_') > -1
							? null
							: elementStack(
									device,
									(item: any) => {
										deleteDevice(item);
									},
									`${device.label ?? device.deviceId}`,
									{name: faMinus, color: 'red'},
									{
										value: device.value,
										onChangeValue: (text: string) =>
											changeDeviceValue(device, text),
										placeholder: '0'
									}
							  )
					)}
					<View
						style={{justifyContent: 'center', alignItems: 'center'}}>
						<SelectForm
							lstData={getDevices()}
							control={control}
							errors={errors}
							name="devices"
							placeholder="Select device"
							rules={{required: false}}
							onValueChange={value => {
								handleSubmit(onSubmitDevice)();
							}}
						/>
					</View>
				</>
			) : null}
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	modules: state.sequence_module.modules,
	devices: state.sequence_module.devices,
	cycle: state.root_cycle.cycle,
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {
	loadModules,
	updateModule,
	updateDevice,
	updateSequence
})(SequenceModulesSettingsSection);
