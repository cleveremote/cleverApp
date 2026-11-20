import {ELEMENT_HEIGHT} from '../../../styles/metrics';
import React from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import {
	faLayerGroup,
	faPlus,
	faTrash,
	faXmark
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {connect} from 'react-redux';
import {isTempId, newTempId} from '../../../../services/socket';
import {DropdownSelect} from '../../../components/common/FormComponents';
import {fieldLabelColor,placeholderColor, inputText} from '../../../styles/components/common/Input';
import {OutlineButton} from '../../access/accessUi';
import {PROPORTIONAL} from '../../../data/cycleTypes';
import {sensorUnit} from '../../../data/controlLoopTypes';
import i18n from 'i18next';

/**
 * ConditionBuilderSection — constructeur de conditions imbriquées.
 *
 * Portage fidèle du mockup HTML fourni : chaque groupe est une parenthèse, avec
 * un connecteur ET/OU basculable entre deux éléments, des conditions
 * (champ / opérateur / valeur) et des sous-groupes récursifs.
 *
 * Branché directement sur `parent.conditions` (liste plate persistée) : l'arbre
 * est reconstruit depuis la liste au montage, et chaque édition renvoie la liste
 * aplatie via `onChange(conditions)` (cf. treeToConditions / conditionsToTree).
 */

// --- Palette alignée sur le design system de l'app (Chakra-like) -----------
// Accent slate #32404e (comme le track des switches), bordures #CBD5E0,
// rouge d'erreur #FC8181. L'état « actif » = fond slate plein + texte blanc.
const C = {
	accent: '#32404e',
	connectorAnd: '#32404e',
	connectorOr: '#DD6B20',
	surface: '#ffffff',
	surface2: '#F7FAFC',
	surface3: '#EDF2F7',
	border: '#CBD5E0',
	borderStrong: '#A0AEC0',
	muted: fieldLabelColor,
	danger: '#E53E3E',
	errorBorder: '#FC8181',
	text: '#32404e'
};

// --- Configuration (alignée sur la section Execution de la condition) --------
// Sensor : opérateur choisi + valeur numérique. Cycle : opérateur forcé à `=`
// (masqué) + valeur ON/OFF.
type ElementType = 'CYCLE' | 'SENSOR';

const SENSOR_OPERATORS: SelectItem[] = [
	{label: '<', value: '<'},
	{label: '>', value: '>'},
	{label: '=', value: '=='},
	{label: '<=', value: '<='},
	{label: '>=', value: '>='}
];
const CYCLE_VALUES: SelectItem[] = [
	{label: 'ON', value: 'ON'},
	{label: 'OFF', value: 'OFF'}
];

// --- Modèle de données -----------------------------------------------------
type Connector = 'ET' | 'OU';

// `connector` = lien ET/OU vers l'élément précédent de la fratrie. Il est porté
// par CHAQUE nœud (et non par le groupe) pour que chaque connecteur soit
// indépendant. Ignoré pour le premier enfant (i === 0).
interface ConditionNode {
	type: 'condition';
	id: number;
	connector: Connector;
	// Élément ciblé : un cycle ou un sensor (cf. switch Cycles/Sensors).
	elementType: ElementType;
	elementId: string;
	operator: string;
	value: string;
	// Condition persistée d'origine (id, parentId, …) conservée pour l'aplatir
	// sans perdre ses champs. Absente pour une condition créée dans le builder.
	source?: any;
}
interface GroupNode {
	type: 'group';
	id: number;
	connector: Connector;
	children: BuilderNode[];
}
type BuilderNode = ConditionNode | GroupNode;

// Élément de liste pour les DropdownSelect (champ / opérateur).
interface SelectItem {
	label: string;
	value: string;
	// Présent pour satisfaire la contrainte générique de DropdownSelect
	// (type « faible » : sans propriété commune la vérification échoue).
	iconColor?: {base: string};
}

// --- Helpers sur l'arbre (portage des fonctions du mockup) ------------------
function findAndRemove(node: BuilderNode, id: number): boolean {
	if (node.type !== 'group') return false;
	const idx = node.children.findIndex(c => c.id === id);
	if (idx > -1) {
		node.children.splice(idx, 1);
		return true;
	}
	for (const c of node.children) {
		if (findAndRemove(c, id)) return true;
	}
	return false;
}

// --- Mapping arbre <-> liste plate persistée ---------------------------------
// Chaque condition de la liste porte :
//  - `connector`   : 'and' | 'or', lien vers l'élément précédent (ignoré pour la
//                    première condition) ;
//  - `symbolStart` : parenthèses ouvrantes avant la condition (ex. '((') ;
//  - `symbolEnd`   : parenthèses fermantes après la condition (ex. ')').
// La racine n'est pas parenthésée. Les groupes vides ne sont pas persistés.
const toFlatConnector = (c: Connector) => (c === 'OU' ? 'or' : 'and');
const toNodeConnector = (c: any): Connector => (c === 'or' ? 'OU' : 'ET');
const countChar = (s: any, ch: string) =>
	typeof s === 'string' ? s.split(ch).length - 1 : 0;

const hasCondition = (node: BuilderNode): boolean =>
	node.type === 'condition' || node.children.some(hasCondition);

export function treeToConditions(
	root: GroupNode,
	parent: {id?: string; parentType?: string}
): any[] {
	const out: any[] = [];
	// `pendingOpen` / `pendingConnector` : à poser sur la prochaine condition émise.
	let pendingOpen = 0;
	let pendingConnector: Connector | undefined;
	const walk = (group: GroupNode, isRoot: boolean) => {
		const children = group.children.filter(hasCondition);
		if (!isRoot) pendingOpen++;
		children.forEach((child, i) => {
			// Le connecteur du 1er enfant appartient au groupe (déjà posé par le
			// parent), sinon c'est celui de l'enfant.
			if (i > 0) pendingConnector = child.connector;
			if (child.type === 'group') {
				walk(child, false);
				return;
			}
			const {source} = child;
			out.push({
				...source,
				id: source?.id,
				parentId: parent.id,
				parentType: parent.parentType,
				elementType: child.elementType,
				elementId: child.elementId,
				operator: child.operator,
				value: child.value,
				connector: toFlatConnector(pendingConnector ?? 'ET'),
				symbolStart: '('.repeat(pendingOpen),
				symbolEnd: '',
				order: out.length + 1,
				isModified: true
			});
			pendingOpen = 0;
			pendingConnector = undefined;
		});
		if (!isRoot && out.length) out[out.length - 1].symbolEnd += ')';
	};
	walk(root, true);
	return out;
}

export function conditionsToTree(
	conditions: any[],
	genId: () => number
): GroupNode | undefined {
	const list = [...(conditions ?? [])]
		.filter(c => c && !c.delete)
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	if (!list.length) return undefined;
	const root: GroupNode = {
		type: 'group',
		id: genId(),
		connector: 'ET',
		children: []
	};
	const stack: GroupNode[] = [root];
	list.forEach(c => {
		const connector = toNodeConnector(c.connector);
		const opens = countChar(c.symbolStart, '(');
		for (let k = 0; k < opens; k++) {
			const g: GroupNode = {
				type: 'group',
				id: genId(),
				// Le connecteur de la condition remonte sur le groupe le plus
				// externe qu'elle ouvre.
				connector: k === 0 ? connector : 'ET',
				children: []
			};
			stack[stack.length - 1].children.push(g);
			stack.push(g);
		}
		stack[stack.length - 1].children.push({
			type: 'condition',
			id: genId(),
			connector: opens ? 'ET' : connector,
			elementType: c.elementType === 'SENSOR' ? 'SENSOR' : 'CYCLE',
			elementId: c.elementId ?? '',
			operator: c.operator ?? (c.elementType === 'SENSOR' ? '==' : '='),
			value: c.value === undefined || c.value === null ? '' : String(c.value),
			source: c
		});
		const closes = countChar(c.symbolEnd, ')');
		for (let k = 0; k < closes && stack.length > 1; k++) stack.pop();
	});
	// Expression entièrement parenthésée : on retire la parenthèse superflue.
	if (root.children.length === 1 && root.children[0].type === 'group') {
		return root.children[0];
	}
	return root;
}

// Condition incomplète (élément / opérateur / valeur manquant). `symbolStart`,
// `symbolEnd` et `connector` sont volontairement ignorés : ils sont générés par
// le builder (structure de l'arbre), jamais saisis, donc jamais « requis ».
export const isConditionIncomplete = (c: any) =>
	!c?.elementId ||
	!c?.operator ||
	c?.value === undefined ||
	c?.value === null ||
	c?.value === '' ||
	(c?.elementType === 'SENSOR' && !/^-?\d+(\.\d+)?$/.test(String(c.value)));

// Au moins une condition incomplète dans l'arbre (sous-groupes compris).
const hasIncompleteCondition = (node: BuilderNode): boolean =>
	node.type === 'condition'
		? isConditionIncomplete(node)
		: node.children.some(hasIncompleteCondition);

// --- Composant principal ---------------------------------------------------
export function ConditionBuilderSection(props: any) {
	// Listes métier issues du store (comme la section Execution).
	const cycles: any[] = props.cycles ?? [];
	const sensors: any[] = props.sensors ?? [];

	// Compteur d'ids stable sur la durée de vie du composant.
	const uidRef = React.useRef(0);
	const genId = () => uidRef.current++;

	const newCondition = (): ConditionNode => ({
		type: 'condition',
		id: genId(),
		connector: 'ET',
		// Par défaut on cible un cycle : opérateur `=` implicite, valeur ON/OFF.
		elementType: 'CYCLE',
		elementId: '',
		operator: '=',
		value: '',
		// Id temporaire (remplacé par le box à la sauvegarde), comme les autres
		// entités créées côté app.
		source: {id: newTempId()}
	});
	const newGroup = (children?: BuilderNode[]): GroupNode => ({
		type: 'group',
		id: genId(),
		connector: 'ET',
		children: children ?? [newCondition()]
	});

	// Arbre maintenu dans un ref (mutations directes façon mockup), avec un
	// compteur de version pour forcer le rendu. Seedé depuis `conditions`, et
	// re-seedé si la liste change hors du builder (ex. rechargement du parent).
	const rootRef = React.useRef<GroupNode | undefined>(undefined);
	const seededFromRef = React.useRef<any>(undefined);
	const emittedRef = React.useRef<any>(undefined);
	// Conditions persistées présentes au seed : celles retirées de l'arbre sont
	// renvoyées marquées `delete` pour que le box les supprime.
	const persistedRef = React.useRef<any[]>([]);
	const conditions: any[] = props.conditions ?? [];
	if (
		!rootRef.current ||
		(conditions !== seededFromRef.current && conditions !== emittedRef.current)
	) {
		seededFromRef.current = conditions;
		persistedRef.current = conditions.filter(c => c?.id && !isTempId(c.id));
		// Rien de pré-construit : sans condition, la racine est vide et seul le
		// bouton « + Condition » s'affiche.
		rootRef.current = conditionsToTree(conditions, genId) ?? newGroup([]);
	}
	const root = rootRef.current;

	const [, setVersion] = React.useState(0);
	const notify = () => {
		setVersion(v => v + 1);
		const flat = treeToConditions(rootRef.current!, {
			id: props.parentId,
			parentType: props.parentType
		});
		const kept = new Set(flat.map(c => c.id));
		const deleted = persistedRef.current
			.filter(c => !kept.has(c.id))
			.map(c => ({...c, delete: true, isModified: true}));
		const next = [...flat, ...deleted];
		emittedRef.current = next;
		props.onChange?.(next);
	};

	// Tant qu'une condition est incomplète, on n'en ajoute pas d'autre : on
	// termine d'abord celle en cours.
	const addConditionDisabled = hasIncompleteCondition(root);

	// Supprimer la racine la vide : on revient au seul bouton « + Condition ».
	const remove = (id: number) => {
		if (id === root.id) root.children = [];
		else findAndRemove(root, id);
		notify();
	};

	return (
		<View style={styles.wrap}>
			<GroupView
				group={root}
				depth={0}
				addConditionDisabled={addConditionDisabled}
				cycles={cycles}
				sensors={sensors}
				showErrors={!!props.showErrors}
				onChange={notify}
				onAddCondition={g => {
					g.children.push(newCondition());
					notify();
				}}
				onAddSubGroup={g => {
					g.children.push(newGroup());
					notify();
				}}
				onRemove={remove}
			/>

			<Text style={styles.hint}>
				{i18n.t('cycle:conditions.builderHint')}
			</Text>
		</View>
	);
}

// --- Groupe (récursif) ------------------------------------------------------
function GroupView({
	group,
	depth,
	addConditionDisabled,
	cycles,
	sensors,
	showErrors,
	onChange,
	onAddCondition,
	onAddSubGroup,
	onRemove
}: {
	group: GroupNode;
	depth: number;
	addConditionDisabled: boolean;
	cycles: any[];
	sensors: any[];
	showErrors: boolean;
	onChange: () => void;
	onAddCondition: (g: GroupNode) => void;
	onAddSubGroup: (g: GroupNode) => void;
	onRemove: (id: number) => void;
}) {
	// Le sous-groupe ne se propose qu'une fois la première condition du groupe
	// complète : tant qu'elle ne l'est pas, il n'y a rien à regrouper.
	const first = group.children[0];
	const canAddSubGroup =
		!!first && (first.type === 'group' || !isConditionIncomplete(first));
	return (
		<View
			style={[styles.group, depth > 0 ? styles.groupNested : null]}>
			{group.children.map((child, i) => (
				<View key={child.id}>
					{i > 0 ? (
						<View style={styles.connectorRow}>
							<TouchableOpacity
								onPress={() => {
									// Connecteur propre à CET enfant : indépendant
									// des autres connecteurs du groupe.
									child.connector =
										child.connector === 'ET' ? 'OU' : 'ET';
									onChange();
								}}
								style={[
									styles.connectorBtn,
									{
										backgroundColor:
											child.connector === 'ET'
												? C.connectorAnd
												: C.connectorOr
									}
								]}>
								<Text style={styles.connectorTxt}>
									{i18n.t(`cycle:conditions.connector.${child.connector}`)}
								</Text>
							</TouchableOpacity>
						</View>
					) : null}

					{child.type === 'condition' ? (
						<ConditionRow
							cond={child}
							// Seule condition du groupe : la corbeille du groupe
							// suffit, pas de croix en double.
							removable={group.children.length > 1}
							cycles={cycles}
							sensors={sensors}
							showErrors={showErrors}
							onChange={onChange}
							onRemove={onRemove}
						/>
					) : (
						<GroupView
							group={child}
							depth={depth + 1}
							addConditionDisabled={addConditionDisabled}
							cycles={cycles}
							sensors={sensors}
							showErrors={showErrors}
							onChange={onChange}
							onAddCondition={onAddCondition}
							onAddSubGroup={onAddSubGroup}
							onRemove={onRemove}
						/>
					)}
				</View>
			))}

			<View style={styles.actions}>
				<OutlineButton
					label={i18n.t('cycle:conditions.condition')}
					icon={faPlus}
					color={C.accent}
					disabled={addConditionDisabled}
					onPress={() => onAddCondition(group)}
					style={styles.actionBtn}
				/>
				{canAddSubGroup ? (
					<OutlineButton
						label={i18n.t('cycle:conditions.subGroup')}
						icon={faLayerGroup}
						color={C.accent}
						onPress={() => onAddSubGroup(group)}
						style={styles.actionBtn}
					/>
				) : null}
				{depth > 0 || group.children.length ? (
					<OutlineButton
						icon={faTrash}
						color={C.danger}
						accessibilityLabel={i18n.t('cycle:conditions.deleteGroup')}
						onPress={() => onRemove(group.id)}
						style={styles.actionBtnIcon}
					/>
				) : null}
			</View>
		</View>
	);
}

// --- Condition (élément / opérateur / valeur) -------------------------------
// Même logique que la section Execution : choix cycle/sensor via switch. En
// cycle l'opérateur est `=` (masqué) et la valeur est ON/OFF ; en sensor
// l'opérateur est choisi et la valeur est strictement numérique.
function ConditionRow({
	cond,
	removable,
	cycles,
	sensors,
	showErrors,
	onChange,
	onRemove
}: {
	cond: ConditionNode;
	removable: boolean;
	cycles: any[];
	sensors: any[];
	showErrors: boolean;
	onChange: () => void;
	onRemove: (id: number) => void;
}) {
	const isSensor = cond.elementType === 'SENSOR';
	const sensor = isSensor
		? sensors.find((x: any) => x.id === cond.elementId)
		: undefined;
	const cycleById = (id: string) => cycles.find((x: any) => x.id === id);
	// Cycle PROPORTIONAL : se compare comme un sensor (opérateur + valeur
	// numérique), la valeur étant le pourcentage d'ouverture.
	const isProportionalId = (id: string) => cycleById(id)?.type === PROPORTIONAL;
	const isProportional = !isSensor && isProportionalId(cond.elementId);
	const isNumeric = isSensor || isProportional;
	// Unité affichée juste après la valeur.
	const unit = isProportional ? '%' : isSensor ? sensorUnit(sensor) : undefined;
	const valueInputRef = React.useRef<TextInput>(null);
	// Suppression en fin de seconde ligne, à côté de la valeur.
	const deleteButton = removable ? (
		<Pressable
			onPress={() => onRemove(cond.id)}
			hitSlop={6}
			accessibilityRole="button"
			accessibilityLabel={i18n.t('cycle:conditions.removeTitle')}
			style={styles.condDelete}>
			<FontAwesomeIcon icon={faXmark} size={16} color={C.danger} />
		</Pressable>
	) : null;
	const elementError = showErrors && !cond.elementId;
	const operatorError = showErrors && !cond.operator;
	const valueError =
		showErrors &&
		(isNumeric ? !/^-?\d+(\.\d+)?$/.test(cond.value) : !cond.value);
	// Sensors parents (ayant des enfants) masqués : seules leurs mesures
	// (enfants) ont une valeur exploitable. On garde celui déjà sélectionné.
	const parentIds = new Set(
		sensors
			.map((x: any) => x.parentId ?? x.parent?.id)
			.filter((id: any) => id != null)
			.map((id: any) => `${id}`)
	);
	const selectableSensors = sensors.filter(
		(x: any) => !parentIds.has(`${x.id}`) || x.id === cond.elementId
	);
	const elementItems: SelectItem[] = (
		isSensor ? selectableSensors : cycles
	).map((x: any) => ({label: x.name, value: x.id}));

	// Bascule Cycle <-> Sensor : réinitialise l'élément, l'opérateur (`=` en
	// cycle, à choisir en sensor) et la valeur (ON/OFF vs numérique).
	const toggleType = () => {
		const nextSensor = !isSensor;
		cond.elementType = nextSensor ? 'SENSOR' : 'CYCLE';
		cond.elementId = '';
		// Sensor : opérateur `=` (valeur `==`) par défaut. Cycle : `=` implicite.
		cond.operator = nextSensor ? '==' : '=';
		cond.value = '';
		onChange();
	};

	return (
		<View style={styles.condition}>
			{/* Bouton type (Cycle/Sensor) + liste de l'élément sur une même
			    ligne. Le bouton reprend le style du bouton ET/OU. */}
			<View style={styles.condTopRow}>
				<TouchableOpacity onPress={toggleType} style={styles.typeBtn}>
					<Text style={styles.typeBtnTxt}>
						{isSensor
							? i18n.t('cycle:conditions.sensor')
							: i18n.t('cycle:conditions.cycle')}
					</Text>
				</TouchableOpacity>
				<View style={{flex: 1}}>
					<DropdownSelect<SelectItem>
						items={elementItems}
						value={cond.elementId}
						getLabel={item => item.label}
						getValue={item => item.value}
						onChange={val => {
							// Cycle classique <-> PROPORTIONAL : l'opérateur et la
							// valeur changent de nature (ON/OFF vs numérique).
							if (
								!isSensor &&
								isProportionalId(val) !== isProportionalId(cond.elementId)
							) {
								cond.operator = isProportionalId(val) ? '==' : '=';
								cond.value = '';
							}
							cond.elementId = val;
							onChange();
						}}
						hasError={elementError}
					/>
				</View>
			</View>

			{isNumeric ? (
				// Sensor / cycle PROPORTIONAL : opérateur choisi + valeur
				// numérique suivie de l'unité.
				<View style={styles.condBottomRow}>
					<View style={{flex: 0.9}}>
						<DropdownSelect<SelectItem>
							items={SENSOR_OPERATORS}
							value={cond.operator}
							getLabel={item => item.label}
							getValue={item => item.value}
							onChange={val => {
								cond.operator = val;
								onChange();
							}}
							hasError={operatorError}
						/>
					</View>
					{/* Unité affichée dans le champ, comme un masque : dans le
					    placeholder tant qu'il est vide, puis juste après la valeur
					    saisie. Affichage seul : `cond.value` reste le nombre. */}
					<Pressable
						style={[
							styles.valueInput,
							valueError ? styles.valueInputError : null
						]}
						onPress={() => valueInputRef.current?.focus()}>
						<TextInput
							ref={valueInputRef}
							key={`${cond.elementType}-${isProportional}`}
							style={
								unit && cond.value
									? styles.valueTextFit
									: styles.valueTextFill
							}
							placeholder={
								unit
									? i18n.t('cycle:conditions.valuePlaceholderUnit', {unit})
									: i18n.t('cycle:conditions.valuePlaceholder')
							}
							placeholderTextColor={placeholderColor}
							keyboardType="decimal-pad"
							defaultValue={cond.value}
							onChangeText={t => {
								// Strictement numérique : on ne garde que chiffres, un
								// point décimal et un éventuel signe moins en tête.
								const cleaned = t
									.replace(/[^0-9.-]/g, '')
									.replace(/(?!^)-/g, '')
									.replace(/(\..*)\./g, '$1');
								cond.value = cleaned;
								onChange();
							}}
						/>
						{unit && cond.value ? (
							<Text style={styles.unit} numberOfLines={1}>
								{` ${unit}`}
							</Text>
						) : null}
					</Pressable>
					{deleteButton}
				</View>
			) : (
				// Cycle : opérateur `=` implicite (masqué), valeur ON/OFF.
				<View style={styles.condBottomRow}>
					<View style={{flex: 1}}>
						<DropdownSelect<SelectItem>
							items={CYCLE_VALUES}
							value={cond.value}
							getLabel={item => item.label}
							getValue={item => item.value}
							onChange={val => {
								cond.value = val;
								onChange();
							}}
							hasError={valueError}
						/>
					</View>
					{deleteButton}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	// Contenu calé sous l'icône de l'en-tête (marginLeft: 10 du MenuAccordion).
	wrap: {paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 14},
	title: {fontSize: 15, color: C.text, fontWeight: 'bold', marginBottom: 10},
	// Boutons d'action du groupe : OutlineButton (cf. accessUi), même hauteur
	// que les inputs (ELEMENT_HEIGHT) ; on neutralise sa marge/centrage par défaut.
	actionBtn: {flex: 1, marginTop: 0, alignSelf: 'auto', justifyContent: 'center'},
	actionBtnIcon: {marginTop: 0, alignSelf: 'auto', justifyContent: 'center'},
	// Même style que la box de la liste des séquences : carte blanche, coins
	// arrondis, ombre douce (cf. CycleSeqSettingsSection).
	group: {
		alignSelf: 'stretch',
		backgroundColor: C.surface,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	groupNested: {marginVertical: 8},
	connectorRow: {alignItems: 'center', marginVertical: 4},
	connectorBtn: {
		paddingHorizontal: 16,
		paddingVertical: 4,
		borderRadius: 20
	},
	connectorTxt: {
		fontSize: 12,
		color: '#ffffff',
		fontWeight: '700'
	},
	condition: {
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 8,
		paddingHorizontal: 8,
		paddingBottom: 6,
		marginVertical: 2
	},
	condTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 6
	},
	// Bouton type (Cycle/Sensor) — mêmes couleurs que les boutons de filtre de
	// la page Cycles (segment actif : fond slate + texte blanc, ombre douce),
	// et même format que l'input à côté (ELEMENT_HEIGHT, coins 12).
	typeBtn: {
		height: ELEMENT_HEIGHT,
		marginVertical: 4,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.accent,
		backgroundColor: C.accent,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.18,
		shadowRadius: 2
	},
	typeBtnTxt: {fontSize: 15, color: '#ffffff', fontWeight: 'bold'},
	condBottomRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
	// Croix seule, sans cadre, centrée sur la hauteur du dropdown voisin.
	condDelete: {
		width: 28,
		height: ELEMENT_HEIGHT,
		marginVertical: 4,
		alignItems: 'center',
		justifyContent: 'center'
	},
	valueInput: {
		flex: 1.5,
		height: ELEMENT_HEIGHT,
		marginVertical: 4,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		// Cadre du champ : valeur saisie + unité sur une ligne.
		flexDirection: 'row',
		alignItems: 'center'
	},
	// Champ vide (ou sans unité) : occupe tout le cadre, placeholder compris.
	valueTextFill: {flex: 1, height: '100%', padding: 0, ...inputText},
	// Valeur saisie : largeur du texte, l'unité vient juste derrière.
	valueTextFit: {
		flexShrink: 1,
		minWidth: 8,
		height: '100%',
		padding: 0,
		...inputText
	},
	unit: {fontSize: 15, color: C.muted, fontWeight: '600'},
	valueInputError: {borderWidth: 2, borderColor: C.errorBorder},
	actions: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
	hint: {fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 17}
});

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps)(ConditionBuilderSection);
