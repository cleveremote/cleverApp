import React, {useEffect} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {faMinus} from '@fortawesome/free-solid-svg-icons';
import {
	InputForm,
	SelectForm,
	SwitchForm
} from '../../components/common/FormComponents';
import {elementStack} from '../../components/cycle/moduleStack';
import {BoxFormStyle} from '../../styles/components/common/boxForm';
import {updateActuator} from '../../../module/process/infrasctructure/store/actions/actuator';
import {loadDevices} from '../../../module/process/infrasctructure/store/actions/device';
import {loadModbusTasks} from '../../../module/process/infrasctructure/store/actions/modbus-task';
import {
	ActuatorType,
	gpioDirectionOptions,
	gpioEdgeOptions,
	isComBased,
	valveTypeOptions
} from '../../data/actuatorTypes';
import {toNumber} from '../devices/deviceFieldUtils';
import {useActuatorSection} from './useActuatorSection';

// Les champs numériques de chaque config : react-hook-form stocke les saisies en
// chaînes, on les recoerce avant de stager l'entité.
const RPI_NUMERIC_FIELDS = ['rpiPin', 'debounceTimeout'];

// Boucle de régulation d'une vanne CTRL, dans l'ordre d'affichage.
const CTRL_REGULATION_FIELDS: {name: string; label: string}[] = [
	{name: 'maxFlowRate', label: 'Max flow rate'},
	{name: 'kP', label: 'kP (gain)'},
	{name: 'minOpening', label: 'Min opening (%)'},
	{name: 'maxOpening', label: 'Max opening (%)'},
	{name: 'openingPercent', label: 'Opening (%)'},
	{name: 'tolerance', label: 'Tolerance'},
	{name: 'maxIterations', label: 'Max iterations'},
	{name: 'iterationDelayMs', label: 'Iteration delay (ms)'},
	{name: 'fullStrokeMs', label: 'Full stroke (ms)'}
];

const CTRL_NUMERIC_FIELDS = [
	'channel',
	...CTRL_REGULATION_FIELDS.map(f => f.name)
];

// Actuator Configuration : les champs affichés dépendent du type porté par
// l'entité (choisi dans la section General).
//  - RPI  : la broche GPIO et son paramétrage `onoff`.
//  - COM  : le device modbus + la liste d'actions `{comRequestId, portNumber}`.
//  - CTRL : les champs COM + le paramétrage de la boucle de régulation.
export function ActuatorConfigurationSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.actuatorData
		: props.route.params?.actuatorData;
	const type = source?.type;
	const isRpi = type === ActuatorType.RPI;
	const isCtrl = type === ActuatorType.CTRL;
	const comBased = isComBased(type);

	const transform = (data: any) => {
		const config = {...data.config};
		const numericFields = isRpi
			? RPI_NUMERIC_FIELDS
			: isCtrl
			? CTRL_NUMERIC_FIELDS
			: [];
		numericFields.forEach(field => {
			config[field] = toNumber(config[field]);
		});
		if (comBased) {
			config.actions = (config.actions ?? []).map((action: any) => ({
				comRequestId: action.comRequestId,
				portNumber: toNumber(action.portNumber)
			}));
		}
		return {...data, config};
	};

	const {control, errors, watch, setValue, markDirty} = useActuatorSection(
		props,
		transform,
		['config']
	);

	useEffect(() => {
		// Les listes viennent de la configuration box (chargée au démarrage) ; on
		// les rafraîchit à l'ouverture pour refléter un device/COM request créé
		// entre-temps dans l'espace Devices.
		if (!comBased) return;
		props.loadDevices();
		props.loadModbusTasks();
	}, []);

	const deviceId = watch('config.deviceId');
	const actions: any[] = watch('config.actions') ?? [];

	// Un actuator modbus s'adresse à un device esclave (les COM requests sont
	// portées par les esclaves).
	const deviceOptions = (props.devices ?? [])
		.filter((d: any) => d.type === 'SLAVE' && !d.delete)
		.map((d: any) => ({label: d.name ?? d.label, value: d.id}));

	const comRequestsOfDevice = (props.modbusTasks ?? []).filter(
		(t: any) => `${t.deviceId}` === `${deviceId}`
	);

	const labelOfRequest = (comRequestId: any) => {
		const request = comRequestsOfDevice.find(
			(t: any) => `${t.id}` === `${comRequestId}`
		);
		return request?.name ?? request?.label ?? `${comRequestId}`;
	};

	const availableRequests = comRequestsOfDevice
		.filter(
			(t: any) =>
				!actions.some((a: any) => `${a.comRequestId}` === `${t.id}`)
		)
		.map((t: any) => ({label: t.name ?? t.label, value: t.id}));

	const setActions = (next: any[]) => {
		setValue('config.actions', next, {shouldDirty: true});
		markDirty();
	};

	const addAction = (comRequestId: any) => {
		if (!comRequestId) return;
		if (actions.some((a: any) => `${a.comRequestId}` === `${comRequestId}`))
			return;
		setActions([...actions, {comRequestId, portNumber: undefined}]);
	};

	const removeAction = (comRequestId: any) =>
		setActions(
			actions.filter(
				(a: any) => `${a.comRequestId}` !== `${comRequestId}`
			)
		);

	const setPortNumber = (comRequestId: any, value: string) =>
		setActions(
			actions.map((a: any) =>
				`${a.comRequestId}` === `${comRequestId}`
					? {...a, portNumber: value}
					: a
			)
		);

	// Un CTRL régule sur la mesure d'un débitmètre : on propose les sensors.
	const flowMeterOptions = (props.sensors ?? [])
		.filter((s: any) => !s.delete)
		.map((s: any) => ({label: s.name, value: s.id}));

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={BoxFormStyle.boxForm}>
			<Body {...bodyProps}>
				{isRpi && (
					<>
						<InputForm
							control={control}
							errors={errors}
							name="config.rpiPin"
							placeholder="RPI pin*"
							keyboardType="numeric"
							rules={{required: 'RPI pin is required'}}
							onChangeText={() => markDirty()}
						/>
						<SelectForm
							lstData={gpioDirectionOptions}
							control={control}
							errors={errors}
							name="config.direction"
							placeholder="Direction*"
							rules={{required: 'Direction is required'}}
							onValueChange={() => markDirty()}
						/>
						<SelectForm
							lstData={gpioEdgeOptions}
							control={control}
							errors={errors}
							name="config.edge"
							placeholder="Edge*"
							rules={{required: 'Edge is required'}}
							onValueChange={() => markDirty()}
						/>
						<InputForm
							control={control}
							errors={errors}
							name="config.debounceTimeout"
							placeholder="Debounce timeout (ms)"
							keyboardType="numeric"
							onChangeText={() => markDirty()}
						/>
						<SwitchForm
							control={control}
							errors={errors}
							name="config.activeLow"
							placeholder="Active low"
							onChangeText={() => markDirty()}
						/>
						<SwitchForm
							control={control}
							errors={errors}
							name="config.reconfigureDirection"
							placeholder="Reconfigure direction"
							onChangeText={() => markDirty()}
						/>
					</>
				)}

				{comBased && (
					<>
						<SelectForm
							lstData={deviceOptions}
							control={control}
							errors={errors}
							name="config.deviceId"
							placeholder="Device*"
							rules={{required: 'Device is required'}}
							onValueChange={() => {
								// Les COM requests dépendent du device : les
								// actions déjà posées ne sont plus valides.
								setActions([]);
								markDirty();
							}}
						/>

						<Text style={styles.subSectionTitle}>Actions</Text>
						{actions.map((action: any) =>
							elementStack(
								{id: action.comRequestId},
								() => removeAction(action.comRequestId),
								labelOfRequest(action.comRequestId),
								{name: faMinus, color: 'red'},
								{
									value: action.portNumber,
									onChangeValue: (text: string) =>
										setPortNumber(
											action.comRequestId,
											text
										),
									placeholder: 'port'
								}
							)
						)}
						<SelectForm
							lstData={availableRequests}
							control={control}
							errors={errors}
							name="_addAction"
							placeholder={
								deviceId
									? 'Add action (COM request) ...'
									: 'Select a device first'
							}
							disabled={!deviceId}
							onValueChange={value => addAction(value)}
						/>
					</>
				)}

				{isCtrl && (
					<>
						<Text style={styles.subSectionTitle}>Regulation</Text>
						<InputForm
							control={control}
							errors={errors}
							name="config.channel"
							placeholder="Channel*"
							keyboardType="numeric"
							rules={{required: 'Channel is required'}}
							onChangeText={() => markDirty()}
						/>
						<SelectForm
							lstData={valveTypeOptions}
							control={control}
							errors={errors}
							name="config.valveType"
							placeholder="Valve type*"
							rules={{required: 'Valve type is required'}}
							onValueChange={() => markDirty()}
						/>
						<SelectForm
							lstData={flowMeterOptions}
							control={control}
							errors={errors}
							name="config.flowMeterId"
							placeholder="Flow meter"
							onValueChange={() => markDirty()}
						/>
						{CTRL_REGULATION_FIELDS.map(field => (
							<InputForm
								key={field.name}
								control={control}
								errors={errors}
								name={`config.${field.name}`}
								placeholder={field.label}
								keyboardType="numeric"
								onChangeText={() => markDirty()}
							/>
						))}
					</>
				)}
			</Body>
		</View>
	);
}

const styles = {
	subSectionTitle: {
		color: '#32404e',
		fontSize: 15,
		fontWeight: 'bold' as const,
		marginTop: 16,
		marginBottom: 8
	}
};

const mapStateToProps = (state: any) => ({
	devices: state.root_device.devices,
	modbusTasks: state.root_modbus_task.modbusTasks,
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, {
	updateActuator,
	loadDevices,
	loadModbusTasks
})(ActuatorConfigurationSettingsSection);
