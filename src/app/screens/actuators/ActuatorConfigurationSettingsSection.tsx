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
import {isTempId} from '../../../services/socket';
import {
	ActuatorType,
	actuatorTypeOptions,
	emptyActuatorConfig,
	gpioDirectionOptions,
	gpioEdgeOptions,
	isComBased
} from '../../data/actuatorTypes';
import {toNumber} from '../devices/deviceFieldUtils';
import {findModel} from '../devices/slave/SlaveModelSection';
import {hasActuatorsSection} from '../devices/slave/SlaveActuatorsSection';
import {useActuatorSection} from './useActuatorSection';
import {IS_EXPERT} from '../../../../config/env';

// Les champs numériques de chaque config : react-hook-form stocke les saisies en
// chaînes, on les recoerce avant de stager l'entité.
const RPI_NUMERIC_FIELDS = ['rpiPin', 'debounceTimeout'];

// Paramétrage d'une vanne CTRL affiché, dans l'ordre. Les autres champs de la
// boucle de régulation gardent leurs valeurs par défaut (emptyCtrlConfig).
const CTRL_REGULATION_FIELDS: {name: string; label: string}[] = [
	{name: 'minOpening', label: 'Min opening (%)'},
	{name: 'maxOpening', label: 'Max opening (%)'},
	{name: 'openingPercent', label: 'Opening (%)'},
	{name: 'fullStrokeMs', label: 'Full stroke (ms)'},
	{name: 'minOutputValue', label: 'Min output value'},
	{name: 'maxOutputValue', label: 'Max output value'}
];

const CTRL_NUMERIC_FIELDS = CTRL_REGULATION_FIELDS.map(f => f.name);

// Actuator Configuration : le type (modifiable seulement à la création, comme
// celui d'une COM request) détermine les champs affichés. Le changer
// réinitialise la config avec les valeurs par défaut du nouveau type ; l'écran
// parent keye la section sur le type pour la remonter.
//  - RPI  : la broche GPIO et son paramétrage `onoff`.
//  - COM  : le device modbus + la liste d'actions `{comRequestId, portNumber}`.
//  - CTRL : le device + la liste d'actions `{commandId, channel}` (device
//    commands du modèle du slave) + l'ouverture et la course de la vanne.
export function ActuatorConfigurationSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.actuatorData
		: props.route.params?.actuatorData;
	const type = source?.type;
	const isRpi = type === ActuatorType.RPI;
	const isCtrl = type === ActuatorType.CTRL;
	const comBased = isComBased(type);
	// Hors mode expert, le câblage COM (device + actions) est en lecture seule ;
	// un CTRL reste toujours éditable, quel que soit l'env.
	const readOnly = !IS_EXPERT && !isCtrl;

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
		if (isCtrl) {
			config.actions = (config.actions ?? []).map((action: any) => ({
				commandId: action.commandId,
				channel: toNumber(action.channel)
			}));
		} else if (comBased) {
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
	const slaves = (props.devices ?? []).filter(
		(d: any) => d.type === 'SLAVE' && !d.delete
	);
	const deviceOptions = slaves.map((d: any) => ({
		label: d.name ?? d.label,
		value: d.id
	}));

	// Une action COM pointe une COM request du device (`comRequestId`, paramètre
	// `portNumber`) ; une action CTRL pointe une device command du modèle du
	// slave (`commandId`, paramètre `channel`).
	const actionKey = isCtrl ? 'commandId' : 'comRequestId';
	const paramKey = isCtrl ? 'channel' : 'portNumber';

	const device = (props.devices ?? []).find(
		(d: any) => `${d.id}` === `${deviceId}`
	);
	const actionSources: any[] = isCtrl
		? findModel(props.models, device)?.deviceCommands ?? []
		: (props.modbusTasks ?? []).filter(
				(t: any) => `${t.deviceId}` === `${deviceId}`
		  );

	const labelOfAction = (id: any) => {
		const source = actionSources.find((t: any) => `${t.id}` === `${id}`);
		return source?.name ?? source?.label ?? `${id}`;
	};

	const availableActions = actionSources
		.filter(
			(t: any) => !actions.some((a: any) => `${a[actionKey]}` === `${t.id}`)
		)
		.map((t: any) => ({label: t.name ?? t.label, value: t.id}));

	// Un CTRL n'a pas de champ Device : on propose les device commands de tous
	// les slaves pilotant des actuators, et la commande choisie fixe le device.
	const CTRL_OPTION_SEPARATOR = '::';
	const ctrlActionOptions = slaves
		.filter((d: any) => hasActuatorsSection(props.models, d))
		.flatMap((d: any) =>
			(findModel(props.models, d)?.deviceCommands ?? []).map((c: any) => ({
				label: `${d.name ?? d.label} - ${c.name ?? c.label}`,
				value: `${d.id}${CTRL_OPTION_SEPARATOR}${c.id}`
			}))
		);

	const setActions = (next: any[]) => {
		setValue('config.actions', next, {shouldDirty: true});
		markDirty();
	};

	// Un CTRL ne pilote qu'une seule device command.
	const canAddAction = !readOnly && !(isCtrl && actions.length >= 1);

	const addAction = (id: any) => {
		if (!id || !canAddAction) return;
		if (actions.some((a: any) => `${a[actionKey]}` === `${id}`)) return;
		setActions([...actions, {[actionKey]: id, [paramKey]: undefined}]);
	};

	const addCtrlAction = (value: any) => {
		if (!value || !canAddAction) return;
		const [slaveId, commandId] = `${value}`.split(CTRL_OPTION_SEPARATOR);
		const slave = slaves.find((d: any) => `${d.id}` === slaveId);
		setValue('config.deviceId', slave?.id ?? slaveId, {shouldDirty: true});
		setActions([{commandId, channel: undefined}]);
	};

	const labelOfCtrlAction = (id: any) =>
		[device?.name ?? device?.label, labelOfAction(id)]
			.filter(Boolean)
			.join(' - ');

	const removeAction = (id: any) =>
		setActions(actions.filter((a: any) => `${a[actionKey]}` !== `${id}`));

	const setActionParam = (id: any, value: string) =>
		setActions(
			actions.map((a: any) =>
				`${a[actionKey]}` === `${id}` ? {...a, [paramKey]: value} : a
			)
		);

	const isNew = isTempId(source?.id);
	// Hors mode expert, on ne peut pas créer d'actuator COM / CTRL.
	const typeOptions = IS_EXPERT
		? actuatorTypeOptions
		: actuatorTypeOptions.filter(
				o => o.value === type || !isComBased(o.value)
		  );

	const onTypeChange = (value: string) => {
		markDirty();
		props.updateActuator({
			...(embedded ? props.actuatorData : source),
			type: value,
			config: emptyActuatorConfig(value),
			isModified: true
		});
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={BoxFormStyle.boxForm}>
			<Body {...bodyProps}>
				{/* Un CTRL garde toujours son type : le champ est masqué. */}
				{!isCtrl && (
					<SelectForm
						lstData={typeOptions}
						control={control}
						errors={errors}
						name="type"
						placeholder="Type*"
						disabled={!isNew}
						rules={{required: 'Type is required'}}
						onValueChange={onTypeChange}
					/>
				)}

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
						{!isCtrl && (
							<SelectForm
								lstData={deviceOptions}
								control={control}
								errors={errors}
								name="config.deviceId"
								placeholder="Device*"
								rules={{required: 'Device is required'}}
								disabled={readOnly}
								onValueChange={() => {
									// Les actions dépendent du device : celles
									// déjà posées ne sont plus valides.
									setActions([]);
									markDirty();
								}}
							/>
						)}

						<Text style={styles.subSectionTitle}>Actions</Text>
						{actions.map((action: any) =>
							elementStack(
								{id: action[actionKey]},
								() => removeAction(action[actionKey]),
								isCtrl
									? labelOfCtrlAction(action[actionKey])
									: labelOfAction(action[actionKey]),
								readOnly ? null : {name: faMinus, color: 'red'},
								{
									value: action[paramKey],
									onChangeValue: (text: string) =>
										setActionParam(action[actionKey], text),
									placeholder: isCtrl ? 'channel' : 'port',
									disabled: readOnly
								}
							)
						)}
						{canAddAction && isCtrl && (
							<SelectForm
								lstData={ctrlActionOptions}
								control={control}
								errors={errors}
								name="_addAction"
								placeholder="Add action (device command) ..."
								onValueChange={value => addCtrlAction(value)}
							/>
						)}
						{canAddAction && !isCtrl && (
							<SelectForm
								lstData={availableActions}
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
						)}
					</>
				)}

				{isCtrl && (
					<>
						<Text style={styles.subSectionTitle}>Regulation</Text>
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
	models: state.root_device_model.models
});

export default connect(mapStateToProps, {
	updateActuator,
	loadDevices,
	loadModbusTasks
})(ActuatorConfigurationSettingsSection);
