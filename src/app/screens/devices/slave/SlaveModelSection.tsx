import {fieldLabelColor} from '../../../styles/components/common/Input';
import React from 'react';
import i18n from 'i18next';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {ELEMENT_FONT_SIZE} from '../../../styles/metrics';
import DeviceCommandModal from './DeviceCommandModal';
import {
	ACCESS_STYLE,
	AccessBadge,
	CONFIRM_STYLE,
	CommandAccess,
	Row,
	commandAccess,
	formatRange
} from './commandUi';

// Colonne libellé des lignes du modèle : assez large pour « ID esclave »,
// « Appareil »… sur une seule ligne.
const MODEL_LABEL_WIDTH = 90;

// Modèle du slave (`config.modelId`) dans `config.models`.
export const findModel = (models: any[], device: any) =>
	(models ?? []).find((m: any) => `${m.id}` === `${device?.config?.modelId}`);

export const modelKind = (model: any): string | undefined =>
	model?.kind ?? model?.device?.kind;

const textColor = '#32404e';
// Ligne du nom d'une commande (au plus 2 lignes, tronqué au-delà).
const COMMAND_LINE_HEIGHT = 20;
// Couleur des libellés : source unique (Input.tsx).
const mutedColor = fieldLabelColor;
const COLORS = {
	cardBackground: 'white',
	border: '#e5e7eb',
	chip: '#eef1f4',
	shadow: '#000',
	transparent: 'transparent'
};

type CommandFilter = CommandAccess | 'confirm';

// Filtres : pastilles grises « lecture / écriture / à confirmer », chacune
// précédée d'un petit cercle à la couleur de l'icône des commandes.
const FILTERS: {key: CommandFilter; color: string}[] = [
	{key: 'read', color: ACCESS_STYLE.read.color},
	{key: 'write', color: ACCESS_STYLE.write.color},
	{key: 'confirm', color: CONFIRM_STYLE.color}
];

const matchesFilters = (command: any, filters: CommandFilter[]) => {
	const access = filters.filter(f => f !== 'confirm');
	if (access.length && !access.includes(commandAccess(command))) return false;
	return !filters.includes('confirm') || !!command.params?.isConfirmRequired;
};

function FilterChips({
	selected,
	onToggle
}: Readonly<{
	selected: CommandFilter[];
	onToggle: (key: CommandFilter) => void;
}>) {
	return (
		<View style={styles.filters}>
			{FILTERS.map(({key, color}) => {
				const active = selected.includes(key);
				return (
					<Pressable
						key={key}
						onPress={() => onToggle(key)}
						accessibilityState={{selected: active}}
						style={[styles.filter, active && {borderColor: color}]}
					>
						<View
							style={[
								styles.filterDot,
								{borderColor: color},
								active && {backgroundColor: color}
							]}
						/>
						<Text
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.8}
							style={[
								styles.filterText,
								active && styles.filterTextActive
							]}
						>
							{i18n.t(`devices:model.${key}`)}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

function CommandRow({
	command,
	onOpen
}: Readonly<{command: any; onOpen: () => void}>) {
	const access = commandAccess(command);
	return (
		<View style={styles.command}>
			<View style={{flex: 1}}>
				<Text style={styles.commandName} numberOfLines={2}>
					{command.name ?? command.label}
				</Text>
			</View>
			<Pressable
				onPress={onOpen}
				hitSlop={8}
				style={({pressed}) => ({opacity: pressed ? 0.6 : 1})}
			>
				<AccessBadge
					access={access}
					confirm={!!command.params?.isConfirmRequired}
				/>
			</Pressable>
		</View>
	);
}

// Modèle d'un slave : identité de l'appareil (dont son ID esclave) puis la liste de ses device
// commands (lecture / écriture) ; leur icône ouvre la popin d'exécution.
export function SlaveModelSection(props: any) {
	const model = findModel(props.models, props.device);
	const [opened, setOpened] = React.useState<any>();
	const [filters, setFilters] = React.useState<CommandFilter[]>([]);
	const toggleFilter = (key: CommandFilter) =>
		setFilters(prev =>
			prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
		);

	// Unit id Modbus du slave (`config.slaveId`), en lecture seule.
	const slaveId = props.device?.config?.slaveId;
	const slaveIdRow = (
		<Row
			labelWidth={MODEL_LABEL_WIDTH}
			icon="hashtag"
			label={i18n.t('devices:model.slaveId')}
			value={slaveId != null ? `${slaveId}` : undefined}
		/>
	);

	if (!model) {
		return (
			<View style={styles.embeddedCard}>
				<Text style={styles.empty}>
					{i18n.t('devices:model.none')}
				</Text>
				{slaveIdRow}
			</View>
		);
	}

	const ports = model.device?.portConfig;
	const portRange =
		ports?.portCount != null
			? formatRange({
					min: 0,
					max: ports.portCount - 1,
					labelStart: ports.portNumStart ?? 0
			  })
			: undefined;
	// Lectures d'abord, puis écritures (ordre du modèle conservé dans chaque
	// groupe : `sort` est stable).
	const allCommands = [...(model.deviceCommands ?? [])].sort(
		(a: any, b: any) =>
			(commandAccess(a) === 'read' ? 0 : 1) -
			(commandAccess(b) === 'read' ? 0 : 1)
	);
	const commands = allCommands.filter(c => matchesFilters(c, filters));

	return (
		<View style={styles.embeddedCard}>
			<Row
				labelWidth={MODEL_LABEL_WIDTH}
				icon="microchip"
				label={i18n.t('devices:model.title')}
				value={model.name}
				sub={[modelKind(model), model.description]
					.filter(Boolean)
					.join(' · ')}
			/>
			{slaveIdRow}
			{model.device?.name ? (
				<Row labelWidth={MODEL_LABEL_WIDTH} icon="hdd" label={i18n.t('sensor:dataSource.device')} value={model.device.name} />
			) : null}
			{portRange ? (
				<Row
					labelWidth={MODEL_LABEL_WIDTH}
					icon="plug"
					label={i18n.t('devices:model.ports')}
					value={`${i18n.t('devices:model.portCount', {
						count: ports.portCount
					})} · ${portRange}`}
				/>
			) : null}
			<Text style={styles.subTitle}>{i18n.t('devices:model.commands')}</Text>
			{allCommands.length ? (
				<FilterChips selected={filters} onToggle={toggleFilter} />
			) : null}
			{commands.length === 0 ? (
				<Text style={styles.empty}>
					{i18n.t(
						allCommands.length
							? 'devices:model.noMatch'
							: 'devices:model.noCommand'
					)}
				</Text>
			) : (
				commands.map((c: any) => (
					<CommandRow
						key={c.id ?? c.name}
						command={c}
						onOpen={() => setOpened(c)}
					/>
				))
			)}
			<DeviceCommandModal
				command={opened}
				deviceId={props.device?.id}
				model={model}
				onClose={() => setOpened(undefined)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas d'ombre ni de
	// marge, juste un peu de padding.
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 16
	},
	subTitle: {
		color: textColor,
		fontWeight: 'bold',
		fontSize: 14,
		marginTop: 12,
		marginBottom: 4,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: COLORS.border
	},
	// Même carte que les lignes `elementStack` (cycles) : blanche et ombrée.
	command: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		borderRadius: 12,
		margin: 4,
		// Hauteur fixe pour toutes les commandes : 2 lignes de nom + padding.
		height: 2 * COMMAND_LINE_HEIGHT + 2 * 8,
		paddingVertical: 8,
		paddingLeft: 8,
		paddingRight: 10,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	// Les pastilles se partagent toute la largeur, contenu centré.
	filters: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 4,
		marginBottom: 4,
		// Mord sur le padding de la carte (16) pour laisser plus de largeur.
		marginHorizontal: -10
	},
	filter: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		backgroundColor: COLORS.chip,
		borderRadius: 18,
		// Cadre toujours présent (transparent au repos) pour que la sélection
		// ne décale rien ; il prend la couleur du filtre une fois actif.
		borderWidth: 2,
		borderColor: COLORS.transparent,
		paddingHorizontal: 4,
		paddingVertical: 8
	},
	filterDot: {width: 16, height: 16, borderRadius: 8, borderWidth: 2},
	filterText: {flexShrink: 1, color: textColor, fontSize: 12},
	filterTextActive: {fontWeight: '600'},
	commandName: {
		textAlign: 'left',
		color: textColor,
		fontSize: ELEMENT_FONT_SIZE,
		lineHeight: COMMAND_LINE_HEIGHT,
		fontWeight: 'bold'
	},
	empty: {color: mutedColor, paddingVertical: 8}
});

const mapStateToProps = (state: any) => ({
	models: state.root_device_model.models
});

export default connect(mapStateToProps)(SlaveModelSection);
