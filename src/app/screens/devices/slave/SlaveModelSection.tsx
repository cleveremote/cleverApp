import {fieldLabelColor} from '../../../styles/components/common/Input';
import React from 'react';
import i18n from 'i18next';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {ELEMENT_FONT_SIZE} from '../../../styles/metrics';
import DeviceCommandModal from './DeviceCommandModal';
import {
	FilterChips,
	SearchField,
	normalizeSearch as normalize
} from '../../../components/common/ListFilters';
import {
	ACCESS_STYLE,
	AccessBadge,
	CONFIRM_STYLE,
	CommandAccess,
	Row,
	commandAccess,
	commandPath,
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
// Commandes affichées d'abord, puis par tranche via « Afficher plus ».
const PAGE_SIZE = 50;
// Couleur des libellés : source unique (Input.tsx).
const mutedColor = fieldLabelColor;
const COLORS = {
	cardBackground: 'white',
	border: '#e5e7eb',
	chip: '#eef1f4',
	shadow: '#000'
};

type CommandFilter = 'all' | CommandAccess | 'confirm';

// Filtres : pastilles grises « tout / lecture / écriture / à confirmer »,
// chacune précédée d'un petit cercle à la couleur de l'icône des commandes.
const FILTERS: {key: CommandFilter; color: string}[] = [
	{key: 'all', color: textColor},
	{key: 'read', color: ACCESS_STYLE.read.color},
	{key: 'write', color: ACCESS_STYLE.write.color},
	{key: 'confirm', color: CONFIRM_STYLE.color}
];

// `access` : lecture ou écriture (exclusifs, aucun = les deux) ; `confirm`
// se combine avec. « Tout » = ni l'un ni l'autre.
type Filters = {access?: CommandAccess; confirm: boolean};
const NO_FILTER: Filters = {confirm: false};

const isActive = (filters: Filters, key: CommandFilter) =>
	key === 'all'
		? !filters.access && !filters.confirm
		: key === 'confirm'
		? filters.confirm
		: filters.access === key;

const toggleFilter = (filters: Filters, key: CommandFilter): Filters => {
	if (key === 'all') return NO_FILTER;
	if (key === 'confirm') return {...filters, confirm: !filters.confirm};
	return {...filters, access: filters.access === key ? undefined : key};
};

const matchesFilters = (command: any, filters: Filters, query: string) => {
	if (filters.access && commandAccess(command) !== filters.access) {
		return false;
	}
	if (filters.confirm && !command.params?.isConfirmRequired) return false;
	if (!query) return true;
	// Recherche sur le nom / libellé et le chemin (ex. « outputs/read »).
	return [command.name, command.label, commandPath(command)].some(
		text => text && normalize(`${text}`).includes(query)
	);
};

// `showPath` : pendant une recherche, le chemin s'affiche sous le nom pour
// qu'on voie pourquoi la commande correspond.
function CommandRow({
	command,
	showPath,
	onOpen
}: Readonly<{command: any; showPath?: boolean; onOpen: () => void}>) {
	const access = commandAccess(command);
	const path = showPath ? commandPath(command) : '';
	return (
		<View style={styles.command}>
			<View style={{flex: 1}}>
				<Text style={styles.commandName} numberOfLines={path ? 1 : 2}>
					{command.name ?? command.label}
				</Text>
				{path ? (
					<Text style={styles.commandPath} numberOfLines={1}>
						{path}
					</Text>
				) : null}
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
	const [filters, setFilters] = React.useState<Filters>(NO_FILTER);
	const [search, setSearch] = React.useState('');
	const query = normalize(search.trim());
	const [limit, setLimit] = React.useState(PAGE_SIZE);
	// Nouveaux filtres ou nouvelle recherche : on repart des 50 premières.
	React.useEffect(() => setLimit(PAGE_SIZE), [filters, query]);
	const onToggleFilter = (key: CommandFilter) =>
		setFilters(prev => toggleFilter(prev, key));

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
	const commands = allCommands.filter(c => matchesFilters(c, filters, query));

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
				<>
					<SearchField
						value={search}
						onChange={setSearch}
						placeholder={i18n.t('devices:model.search')}
						clearLabel={i18n.t('devices:model.clearSearch')}
					/>
					<FilterChips
						chips={FILTERS.map(({key, color}) => ({
							key,
							color,
							label: i18n.t(`devices:model.${key}`)
						}))}
						isActive={key => isActive(filters, key)}
						onToggle={onToggleFilter}
					/>
				</>
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
				commands.slice(0, limit).map((c: any) => (
					<CommandRow
						key={c.id ?? c.name}
						command={c}
						showPath={!!query}
						onOpen={() => setOpened(c)}
					/>
				))
			)}
			{commands.length > limit ? (
				<Pressable
					onPress={() => setLimit(l => l + PAGE_SIZE)}
					style={({pressed}) => [
						styles.more,
						{opacity: pressed ? 0.6 : 1}
					]}
				>
					<Text style={styles.moreText}>
						{i18n.t('devices:model.showMore', {
							count: commands.length - limit
						})}
					</Text>
				</Pressable>
			) : null}
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
	commandName: {
		textAlign: 'left',
		color: textColor,
		fontSize: ELEMENT_FONT_SIZE,
		lineHeight: COMMAND_LINE_HEIGHT,
		fontWeight: 'bold'
	},
	commandPath: {
		textAlign: 'left',
		color: mutedColor,
		fontSize: 12,
		lineHeight: 16
	},
	more: {
		alignSelf: 'center',
		backgroundColor: COLORS.chip,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginTop: 8
	},
	moreText: {color: textColor, fontSize: 13, fontWeight: '600'},
	empty: {color: mutedColor, paddingVertical: 8}
});

const mapStateToProps = (state: any) => ({
	models: state.root_device_model.models
});

export default connect(mapStateToProps)(SlaveModelSection);
