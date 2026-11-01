import React from 'react';
import {Alert, Pressable, Text, View} from 'react-native';
import {connect} from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {hapticOptions} from '../../../data/cycleTypes';
import {isTempId} from '../../../../services/socket';
import {
	saveSensor,
	updateSensor
} from '../../../../module/process/infrasctructure/store/actions/sensor';
import {NewSchedulingSection} from '../../cycle/schedules/settings/schedule/NewSchedulingSection';

const textColor = '#32404e';
const mutedColor = '#8a96a3';
// Même couleur que les icônes des sections (MenuAccordion).
const accentColor = '#32404e';

// Section « Data source » : montre d'où vient la valeur d'un sensor COM ou
// ANALOG.
//  - parent (pas de parentId) : la lecture planifiée (modèle, commande,
//    fréquence) et les mesures qu'elle produit, c.-à-d. les `fields` de la
//    commande, reliés à leurs sensors enfants (`config.field`).
//  - enfant : la mesure lue, sa valeur, le parent dont elle est issue (et la
//    fréquence héritée) et l'appareil.

// Seuls les champs marqués `autoCreate` sont des mesures exploitables ; les
// autres (centièmes, valeurs brutes…) restent des champs techniques.
const isMeasureField = (field: any) => field?.autoCreate === true;

// Types de sensor lus via une commande d'appareil (lecture planifiée par un
// parent, mesures portées par ses enfants).
export const DEVICE_COMMAND_SENSOR_TYPES = ['COM', 'ANALOG'];

export const isDeviceCommandType = (type?: string) =>
	DEVICE_COMMAND_SENSOR_TYPES.includes(type ?? '');

// Sensor COM/ANALOG du modèle « commande d'appareil » : parent relié à une
// commande (`config.commandId`) ou enfant lisant un champ de cette commande
// (`config.field`). Les COM de l'ancien modèle (comRequestId / code) n'en sont
// pas.
export const hasDataSource = (sensor: any) =>
	isDeviceCommandType(sensor?.type) &&
	(!!sensor?.deviceCommand ||
		!!sensor?.config?.commandId ||
		(sensor?.parentId != null && !!sensor?.config?.field));

const getFields = (command: any): any[] =>
	command?.params?.result?.type === 'fields'
		? command.params.result.fields || []
		: [];

// Traduit les patterns cron courants (6 champs, secondes en tête) en texte
// lisible ; les autres restent affichés tels quels.
export const describeCron = (pattern?: string): string | undefined => {
	if (!pattern) return undefined;
	const parts = pattern.trim().split(/\s+/);
	if (parts.length !== 6) return undefined;
	const [sec, min, hour, dom, month, dow] = parts;
	const restIsStar = (xs: string[]) => xs.every(x => x === '*');
	const every = (n: string, unit: string) =>
		n === '1' ? `Every ${unit}` : `Every ${n} ${unit}s`;
	let m = /^\*\/(\d+)$/.exec(sec);
	if (m && restIsStar([min, hour, dom, month, dow])) {
		return every(m[1], 'second');
	}
	if (sec === '*' && restIsStar([min, hour, dom, month, dow])) {
		return 'Every second';
	}
	m = /^\*\/(\d+)$/.exec(min);
	if (/^\d+$/.test(sec) && m && restIsStar([hour, dom, month, dow])) {
		return every(m[1], 'minute');
	}
	if (
		/^\d+$/.test(sec) &&
		min === '*' &&
		restIsStar([hour, dom, month, dow])
	) {
		return 'Every minute';
	}
	m = /^\*\/(\d+)$/.exec(hour);
	if (
		/^\d+$/.test(sec) &&
		/^\d+$/.test(min) &&
		m &&
		restIsStar([dom, month, dow])
	) {
		return every(m[1], 'hour');
	}
	return undefined;
};

const formatValue = (value: any) =>
	value === undefined || value === null || value === '' ? '—' : `${value}`;

const formatAge = (date?: string) => {
	if (!date) return undefined;
	const t = new Date(date).getTime();
	if (isNaN(t)) return undefined;
	const s = Math.max(0, Math.round((Date.now() - t) / 1000));
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)} min ago`;
	if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
	return new Date(t).toLocaleDateString();
};

function InfoRow({
	icon,
	label,
	value,
	sub,
	onPress,
	expanded
}: Readonly<{
	icon?: string;
	label: string;
	value?: string;
	sub?: string;
	onPress?: () => void;
	// Ligne pliable : chevron vers le bas quand le contenu est déplié.
	expanded?: boolean;
}>) {
	const content = (
		<View style={{flexDirection: 'row', paddingVertical: 8}}>
			<View style={{width: 26, paddingTop: 2}}>
				{icon ? (
					<Icon name={icon} size={14} color={mutedColor} />
				) : null}
			</View>
			<Text style={{width: 90, color: mutedColor, fontSize: 14}}>
				{label}
			</Text>
			<View style={{flex: 1}}>
				<Text
					style={{
						color: onPress ? accentColor : textColor,
						fontSize: 15,
						fontWeight: '600'
					}}
				>
					{value || '—'}
				</Text>
				{sub ? (
					<Text
						style={{color: mutedColor, fontSize: 12, marginTop: 2}}
					>
						{sub}
					</Text>
				) : null}
			</View>
			{onPress ? (
				<Icon
					name={expanded ? 'chevron-down' : 'chevron-right'}
					size={14}
					color={mutedColor}
				/>
			) : null}
		</View>
	);
	if (!onPress) return content;
	return (
		<Pressable
			onPress={onPress}
			style={({pressed}) => ({opacity: pressed ? 0.6 : 1})}
		>
			{content}
		</Pressable>
	);
}

function SectionTitle({children}: Readonly<{children: React.ReactNode}>) {
	return (
		<Text
			style={{
				color: textColor,
				fontWeight: 'bold',
				fontSize: 14,
				marginTop: 14,
				marginBottom: 4,
				paddingTop: 10,
				borderTopWidth: 1,
				borderTopColor: '#e5e7eb'
			}}
		>
			{children}
		</Text>
	);
}

export function SensorDataSourceSettingsSection(props: any) {
	const source = props.sensorData;
	const sourceRef = React.useRef(source);
	sourceRef.current = source;
	const [showTechnical, setShowTechnical] = React.useState(false);
	const [showFrequency, setShowFrequency] = React.useState(false);

	const sensors: any[] = (props.sensors || []).filter((x: any) => !x.delete);
	const isChild = source?.parentId != null;
	const parent = isChild
		? sensors.find(x => `${x.id}` === `${source.parentId}`)
		: source;
	// Un enfant fraîchement créé n'a pas toujours la commande résolue par le
	// backend : on retombe sur celle du parent.
	const command = source?.deviceCommand || parent?.deviceCommand;
	const model = source?.model || parent?.model;
	const fields = getFields(command);
	const measureFields = fields.filter(isMeasureField);
	const technicalFields = fields.filter(f => !isMeasureField(f));
	const cronPattern = parent?.config?.cronPattern;

	const liveValue = (sensor: any) => {
		const status = (props.values || []).find(
			(x: any) => `${x.id}` === `${sensor?.id}`
		);
		return {
			value: status?.value ?? sensor?.value,
			date: status?.date ?? sensor?.date
		};
	};

	// L'écran de réglages ne gère qu'un sensor à la fois (slot redux unique) :
	// on remplace l'écran plutôt que d'en empiler un second.
	const openSensor = (sensor: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		props.navigation.replace('SensorSettingsMenu', {id: sensor.id});
	};

	const createChild = (field: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (isTempId(source?.id)) {
			Alert.alert(
				'Save first',
				'Save this sensor before creating its measures.'
			);
			return;
		}
		Alert.alert('Create measure', `Create the sensor "${field.label}"?`, [
			{text: 'Cancel', style: 'cancel'},
			{
				text: 'Create',
				onPress: () =>
					props.saveSensor({
						name: field.label || field.name,
						description: `${model?.name || source?.name} ${
							field.label || field.name
						}`,
						// L'enfant garde le type de son parent (COM ou ANALOG).
						type: source.type,
						parentId: source.id,
						isEnabled: true,
						display: true,
						style: {
							bgColor: source?.style?.bgColor,
							fontColor: source?.style?.fontColor,
							iconColor: source?.style?.iconColor
						},
						config: {field: field.name, unit: field.unit},
						isModified: true
					})
			}
		]);
	};

	const childFor = (field: any) =>
		sensors.find(
			x =>
				`${x.parentId}` === `${source?.id}` &&
				x.config?.field === field.name
		);

	if (!command && !isChild) {
		return (
			<View style={BoxFormStyle.boxForm}>
				<Text style={{color: mutedColor}}>
					No device command linked to this sensor yet. Pick a device
					and a request in Configuration.
				</Text>
			</View>
		);
	}

	if (isChild) {
		const field = fields.find(f => f.name === source?.config?.field);
		const {value, date} = liveValue(source);
		// Un ANALOG affiche la valeur convertie : unité de son échelle.
		const unit =
			source?.config?.scaling?.unit ?? field?.unit ?? source?.config?.unit;
		return (
			<View style={BoxFormStyle.boxForm}>
				<InfoRow
					icon="tachometer-alt"
					label="Value"
					value={`${formatValue(value)}${unit ? ` ${unit}` : ''}`}
					sub={formatAge(date) && `Updated ${formatAge(date)}`}
				/>
				<InfoRow
					icon="link"
					label="From"
					value={parent?.name || 'Unknown parent'}
					sub={
						cronPattern
							? `Read ${(
									describeCron(cronPattern) || cronPattern
							  ).toLowerCase()} (inherited)`
							: undefined
					}
					onPress={parent ? () => openSensor(parent) : undefined}
				/>
				<InfoRow
					icon="microchip"
					label="Device"
					value={model?.name}
					sub={command?.name}
				/>
			</View>
		);
	}

	const linkedCount = measureFields.filter(childFor).length;

	// ANALOG : le sensor lit lui-même une voie (`config.field`) avec la
	// commande `config.commandId` ; sa valeur (convertie par l'échelle) est la
	// mesure produite. Une voie numérique est stockée à partir de 0 et affichée
	// à partir du `labelStart` de la commande.
	const isAnalog = source?.type === 'ANALOG';
	const channel = source?.config?.field;
	const channelSpec = command?.params?.channel;
	const channelLabel =
		channel === undefined || channel === null || channel === ''
			? undefined
			: Number.isNaN(Number(channel))
			? `${channel}`
			: `${Number(channel) + (channelSpec?.labelStart ?? 0)}`;
	const analogValue = liveValue(source);
	const analogUnit = source?.config?.scaling?.unit ?? source?.config?.unit;

	return (
		<View style={BoxFormStyle.boxForm}>
			<InfoRow
				icon="microchip"
				label="Device"
				value={model?.name}
				sub={[model?.kind, model?.description]
					.filter(Boolean)
					.join(' · ')}
			/>
			<InfoRow
				icon="sync-alt"
				label="Reading"
				value={command?.name}
				sub={command?.description}
			/>
			<InfoRow
				icon="clock"
				label="Frequency"
				value={describeCron(cronPattern) || cronPattern || 'Not set'}
				sub={describeCron(cronPattern) ? cronPattern : undefined}
				expanded={showFrequency}
				onPress={() => {
					ReactNativeHapticFeedback.trigger(
						'impactMedium',
						hapticOptions
					);
					setShowFrequency(prev => !prev);
				}}
			/>
			{showFrequency ? (
				// Fréquence de lecture (config.cronPattern) : même builder cron
				// que les schedules, sans date ponctuelle ni solaire. Monté à
				// l'ouverture pour relire le pattern courant ; les changements
				// sont stagés sur le sensor, la sauvegarde reste celle de l'écran.
				<NewSchedulingSection
					key={source?.id}
					cronOnly
					hideRuns
					cron={{pattern: cronPattern}}
					onChange={(dto: any) =>
						props.updateSensor({
							...sourceRef.current,
							config: {
								...sourceRef.current?.config,
								cronPattern: dto.pattern
							},
							isModified: true
						})
					}
				/>
			) : null}
			{isAnalog ? (
				<>
					<SectionTitle>Measure produced</SectionTitle>
					<InfoRow
						icon="random"
						label="Channel"
						value={channelLabel ?? 'Not set'}
					/>
					<InfoRow
						icon="tachometer-alt"
						label="Value read"
						value={`${formatValue(analogValue.value)}${
							analogUnit ? ` ${analogUnit}` : ''
						}`}
						sub={
							formatAge(analogValue.date) &&
							`Updated ${formatAge(analogValue.date)}`
						}
					/>
				</>
			) : null}
			{isAnalog && !measureFields.length ? null : (
				<SectionTitle>
					Measures produced ({linkedCount} / {measureFields.length})
				</SectionTitle>
			)}
			{linkedCount === 0 && !isAnalog ? (
				<Text
					style={{color: mutedColor, fontSize: 13, marginBottom: 4}}
				>
					This reading does not produce any measure yet. Create the
					ones you want to follow.
				</Text>
			) : null}
			{measureFields.map(field => {
				const child = childFor(field);
				const {value, date} = liveValue(child);
				const childUnit = child?.config?.scaling?.unit ?? field.unit;
				return (
					<Pressable
						key={field.name}
						disabled={!child}
						onPress={() => child && openSensor(child)}
						style={({pressed}) => ({
							flexDirection: 'row',
							alignItems: 'center',
							paddingVertical: 10,
							opacity: pressed ? 0.6 : 1
						})}
					>
						<Icon
							name="circle"
							solid={!!child}
							size={10}
							color={child ? accentColor : mutedColor}
							style={{width: 26}}
						/>
						<View style={{flex: 1}}>
							<Text
								style={{
									color: child ? textColor : mutedColor,
									fontSize: 15,
									fontWeight: '600'
								}}
							>
								{child?.name || field.label}
							</Text>
							{child && formatAge(date) ? (
								<Text style={{color: mutedColor, fontSize: 12}}>
									{formatAge(date)}
								</Text>
							) : null}
						</View>
						{child ? (
							<>
								<Text
									style={{
										color: textColor,
										fontSize: 15,
										marginRight: 10
									}}
								>
									{formatValue(value)}
									{childUnit ? ` ${childUnit}` : ''}
								</Text>
								<Icon
									name="chevron-right"
									size={14}
									color={mutedColor}
								/>
							</>
						) : (
							<Pressable
								onPress={() => createChild(field)}
								style={({pressed}) => ({
									flexDirection: 'row',
									alignItems: 'center',
									paddingHorizontal: 10,
									paddingVertical: 4,
									borderRadius: 12,
									borderWidth: 1,
									borderColor: accentColor,
									opacity: pressed ? 0.6 : 1
								})}
							>
								<Icon
									name="plus"
									size={11}
									color={accentColor}
								/>
								<Text
									style={{
										color: accentColor,
										marginLeft: 4,
										fontSize: 13
									}}
								>
									Create
								</Text>
							</Pressable>
						)}
					</Pressable>
				);
			})}
			{technicalFields.length ? (
				<Pressable
					onPress={() => setShowTechnical(prev => !prev)}
					style={{paddingVertical: 8}}
				>
					<Text style={{color: mutedColor, fontSize: 13}}>
						{showTechnical ? '▾' : '▸'} Technical fields (
						{technicalFields.length})
					</Text>
				</Pressable>
			) : null}
			{showTechnical
				? technicalFields.map(field => (
						<Text
							key={field.name}
							style={{
								color: mutedColor,
								fontSize: 12,
								marginLeft: 26,
								paddingVertical: 2
							}}
						>
							{field.label} · {field.name} · {field.type}
						</Text>
				  ))
				: null}
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	values: state.root_sensor.values
});

export default connect(mapStateToProps, {
	saveSensor,
	updateSensor
})(SensorDataSourceSettingsSection);
