import React, {useEffect} from 'react';
import i18n from 'i18next';
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

// Les champs numériques de chaque config : react-hook-form stocke les saisies en
// chaînes, on les recoerce avant de stager l'entité.
const RPI_NUMERIC_FIELDS = ['rpiPin', 'debounceTimeout'];

// Paramétrage d'une vanne CTRL affiché, dans l'ordre. Les autres champs de la
// boucle de régulation gardent leurs valeurs par défaut (emptyCtrlConfig).
const CTRL_REGULATION_FIELDS: {
	name:
		| 'minOpening'
		| 'maxOpening'
		| 'openingPercent'
		| 'fullStrokeMs'
		| 'minOutputValue'
		| 'maxOutputValue';
}[] = [
	{name: 'minOpening'},
	{name: 'maxOpening'},
	{name: 'openingPercent'},
	{name: 'fullStrokeMs'},
	{name: 'minOutputValue'},
	{name: 'maxOutputValue'}
];

const CTRL_NUMERIC_FIELDS = CTRL_REGULATION_FIELDS.map(f => f.name);

// Actuator Configuration : le type (modifiable seulement à la création, comme
// celui d'une COM request) détermine les champs affichés. Le changer
// réinitialise la config avec les valeurs par défaut du nouveau type ; l'écran
// parent keye la section sur le type pour la remonter.
//  - RPI  : le type, la broche GPIO et son paramétrage `onoff`.
//  - COM  : une seule action `{commandId, channel}` (device command du modèle
//    d'un slave, qui fixe `deviceId`).
//  - CTRL : la même action + l'ouverture et la course de la vanne.
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
				commandId: action.commandId,
				channel: toNumber(action.channel)
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
		// La liste des devices vient de la configuration box (chargée au
		// démarrage) ; on la rafraîchit à l'ouverture pour refléter un slave créé
		// entre-temps dans l'espace Devices.
		if (!comBased) return;
		props.loadDevices();
	}, []);

	const deviceId = watch('config.deviceId');
	const actions: any[] = watch('config.actions') ?? [];

	const slaves = (props.devices ?? []).filter(
		(d: any) => d.type === 'SLAVE' && !d.delete
	);
	const device = slaves.find((d: any) => `${d.id}` === `${deviceId}`);

	// Pas de champ Device : on propose les device commands de tous les slaves
	// pilotant des actuators, et la commande choisie fixe le device.
	const OPTION_SEPARATOR = '::';
	const actionOptions = slaves
		.filter((d: any) => hasActuatorsSection(props.models, d))
		.flatMap((d: any) =>
			(findModel(props.models, d)?.deviceCommands ?? []).map(
				(c: any) => ({
					label: `${d.name ?? d.label} - ${c.name ?? c.label}`,
					value: `${d.id}${OPTION_SEPARATOR}${c.id}`
				})
			)
		);

	const labelOfAction = (commandId: any) => {
		const command = (
			findModel(props.models, device)?.deviceCommands ?? []
		).find((c: any) => `${c.id}` === `${commandId}`);
		return [
			device?.name ?? device?.label,
			command?.name ?? command?.label ?? `${commandId}`
		]
			.filter(Boolean)
			.join(' - ');
	};

	const setActions = (next: any[]) => {
		setValue('config.actions', next, {shouldDirty: true});
		markDirty();
	};

	// Un actuator COM / CTRL ne pilote qu'une seule device command.
	const canAddAction = actions.length === 0;

	const addAction = (value: any) => {
		if (!value || !canAddAction) return;
		const [slaveId, commandId] = `${value}`.split(OPTION_SEPARATOR);
		const slave = slaves.find((d: any) => `${d.id}` === slaveId);
		setValue('config.deviceId', slave?.id ?? slaveId, {
			shouldDirty: true
		});
		setActions([{commandId, channel: undefined}]);
	};

	const removeAction = (commandId: any) =>
		setActions(
			actions.filter((a: any) => `${a.commandId}` !== `${commandId}`)
		);

	const setChannel = (commandId: any, value: string) =>
		setActions(
			actions.map((a: any) =>
				`${a.commandId}` === `${commandId}` ? {...a, channel: value} : a
			)
		);

	const isNew = isTempId(source?.id);

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
				{/* Un COM / CTRL garde toujours son type : le champ est masqué. */}
				{!comBased && (
					<SelectForm
						lstData={actuatorTypeOptions}
						control={control}
						errors={errors}
						name="type"
						placeholder={i18n.t('sensor:config.type')}
						disabled={!isNew}
						rules={{required: i18n.t('sensor:config.typeRequired')}}
						onValueChange={onTypeChange}
					/>
				)}

				{isRpi && (
					<>
						<InputForm
							control={control}
							errors={errors}
							name="config.rpiPin"
							placeholder={i18n.t('actuators:rpi.pin')}
							keyboardType="numeric"
							rules={{required: i18n.t('actuators:rpi.pinRequired')}}
							onChangeText={() => markDirty()}
						/>
						<SelectForm
							lstData={gpioDirectionOptions}
							control={control}
							errors={errors}
							name="config.direction"
							placeholder={i18n.t('actuators:rpi.direction')}
							rules={{required: i18n.t('actuators:rpi.directionRequired')}}
							onValueChange={() => markDirty()}
						/>
						<SelectForm
							lstData={gpioEdgeOptions}
							control={control}
							errors={errors}
							name="config.edge"
							placeholder={i18n.t('actuators:rpi.edge')}
							rules={{required: i18n.t('actuators:rpi.edgeRequired')}}
							onValueChange={() => markDirty()}
						/>
						<InputForm
							control={control}
							errors={errors}
							name="config.debounceTimeout"
							placeholder={i18n.t('actuators:rpi.debounce')}
							keyboardType="numeric"
							onChangeText={() => markDirty()}
						/>
						<SwitchForm
							control={control}
							errors={errors}
							name="config.activeLow"
							placeholder={i18n.t('actuators:rpi.activeLow')}
							onChangeText={() => markDirty()}
						/>
						<SwitchForm
							control={control}
							errors={errors}
							name="config.reconfigureDirection"
							placeholder={i18n.t('actuators:rpi.reconfigureDirection')}
							onChangeText={() => markDirty()}
						/>
					</>
				)}

				{comBased && (
					<>
						<Text style={styles.subSectionTitle}>
							{i18n.t('actuators:actions')}
						</Text>
						{actions.map((action: any) =>
							elementStack(
								{id: action.commandId},
								() => removeAction(action.commandId),
								labelOfAction(action.commandId),
								{name: faMinus, color: 'red'},
								{
									value: action.channel,
									onChangeValue: (text: string) =>
										setChannel(action.commandId, text),
									placeholder: i18n.t('actuators:channel')
								}
							)
						)}
						{canAddAction && (
							<SelectForm
								lstData={actionOptions}
								control={control}
								errors={errors}
								name="_addAction"
								placeholder={i18n.t('actuators:addAction')}
								onValueChange={value => addAction(value)}
							/>
						)}
					</>
				)}

				{isCtrl && (
					<>
						<Text style={styles.subSectionTitle}>
							{i18n.t('cycle:controlLoop.regulation')}
						</Text>
						{CTRL_REGULATION_FIELDS.map(field => (
							<InputForm
								key={field.name}
								control={control}
								errors={errors}
								name={`config.${field.name}`}
								placeholder={i18n.t(`actuators:ctrl.${field.name}`)}
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
	models: state.root_device_model.models
});

export default connect(mapStateToProps, {
	updateActuator,
	loadDevices
})(ActuatorConfigurationSettingsSection);
