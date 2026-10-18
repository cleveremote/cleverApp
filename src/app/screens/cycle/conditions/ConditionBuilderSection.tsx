import React from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faLayerGroup,
	faPlus,
	faTrash,
	faXmark
} from '@fortawesome/free-solid-svg-icons';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {connect} from 'react-redux';
import {isTempId, newTempId} from '../../../../services/socket';
import {DropdownSelect} from '../../../components/common/FormComponents';
import {placeholderColor} from '../../../styles/components/common/Input';

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
	muted: '#718096',
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

// Nombre total de groupes dans l'arbre (racine incluse). Sert à interdire la
// suppression du dernier groupe restant.
function countGroups(node: BuilderNode): number {
	if (node.type !== 'group') return 0;
	return node.children.reduce((s, c) => s + countGroups(c), 1);
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
		rootRef.current =
			conditionsToTree(conditions, genId) ?? newGroup([newCondition()]);
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

	// Un groupe peut toujours être supprimé, sauf le dernier restant.
	const canDeleteGroup = countGroups(root) > 1;

	const remove = (id: number) => {
		if (id === root.id) {
			// Suppression de la racine = on « désencapsule » : le premier
			// sous-groupe direct devient la nouvelle racine (inverse de
			// « Add new group »). Garanti d'exister tant que canDeleteGroup.
			const promoted = root.children.find(
				(c): c is GroupNode => c.type === 'group'
			);
			if (promoted) rootRef.current = promoted;
		} else {
			findAndRemove(root, id);
		}
		notify();
	};

	const wrapInGroup = () => {
		rootRef.current = newGroup([root, newCondition()]);
		notify();
	};

	return (
		<View style={styles.wrap}>
			<GroupView
				group={root}
				depth={0}
				canDelete={canDeleteGroup}
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

			{/* Groupe englobant — même bouton que « Add new sequence » (+). */}
			<View style={styles.addButtonWrapper}>
				<TouchableOpacity style={styles.addButton} onPress={wrapInGroup}>
					<Icon name="times-circle" size={30} color={C.accent} />
				</TouchableOpacity>
				<Text style={styles.addLabel}>Add new group ...</Text>
			</View>

			<Text style={styles.hint}>
				Astuce : touchez ET / OU pour inverser le connecteur. Un groupe =
				une parenthèse.
			</Text>
		</View>
	);
}

// --- Groupe (récursif) ------------------------------------------------------
function GroupView({
	group,
	depth,
	canDelete,
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
	// Faux uniquement pour le dernier groupe restant (non supprimable).
	canDelete: boolean;
	cycles: any[];
	sensors: any[];
	showErrors: boolean;
	onChange: () => void;
	onAddCondition: (g: GroupNode) => void;
	onAddSubGroup: (g: GroupNode) => void;
	onRemove: (id: number) => void;
}) {
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
									{child.connector}
								</Text>
							</TouchableOpacity>
						</View>
					) : null}

					{child.type === 'condition' ? (
						<ConditionRow
							cond={child}
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
							canDelete={canDelete}
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
				<TouchableOpacity
					onPress={() => onAddCondition(group)}
					style={[styles.btn, {flex: 1}]}>
					<FontAwesomeIcon icon={faPlus} size={12} color={C.text} />
					<Text style={styles.btnTxt}>Condition</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => onAddSubGroup(group)}
					style={[styles.btn, {flex: 1}]}>
					<FontAwesomeIcon
						icon={faLayerGroup}
						size={12}
						color={C.text}
					/>
					<Text style={styles.btnTxt}>Sous-groupe</Text>
				</TouchableOpacity>
				{canDelete ? (
					<TouchableOpacity
						onPress={() => onRemove(group.id)}
						style={[styles.btn, styles.btnDanger]}>
						<FontAwesomeIcon
							icon={faTrash}
							size={12}
							color={C.danger}
						/>
					</TouchableOpacity>
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
	cycles,
	sensors,
	showErrors,
	onChange,
	onRemove
}: {
	cond: ConditionNode;
	cycles: any[];
	sensors: any[];
	showErrors: boolean;
	onChange: () => void;
	onRemove: (id: number) => void;
}) {
	const isSensor = cond.elementType === 'SENSOR';
	const elementError = showErrors && !cond.elementId;
	const operatorError = showErrors && !cond.operator;
	const valueError =
		showErrors &&
		(isSensor ? !/^-?\d+(\.\d+)?$/.test(cond.value) : !cond.value);
	const elementItems: SelectItem[] = (isSensor ? sensors : cycles).map(
		(x: any) => ({label: x.name, value: x.id})
	);

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
			{/* Bouton type (Cycle/Sensor) + liste de l'élément + suppression,
			    sur une même ligne. Le bouton reprend le style du bouton ET/OU. */}
			<View style={styles.condTopRow}>
				<TouchableOpacity onPress={toggleType} style={styles.typeBtn}>
					<Text style={styles.typeBtnTxt}>
						{isSensor ? 'Sensor' : 'Cycle'}
					</Text>
				</TouchableOpacity>
				<View style={{flex: 1}}>
					<DropdownSelect<SelectItem>
						items={elementItems}
						value={cond.elementId}
						getLabel={item => item.label}
						getValue={item => item.value}
						onChange={val => {
							cond.elementId = val;
							onChange();
						}}
						hasError={elementError}
					/>
				</View>
				<Pressable
					onPress={() => onRemove(cond.id)}
					style={styles.condDelete}>
					<FontAwesomeIcon icon={faXmark} size={14} color={C.danger} />
				</Pressable>
			</View>

			{isSensor ? (
				// Sensor : opérateur choisi + valeur numérique.
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
					<TextInput
						style={[
							styles.valueInput,
							valueError ? styles.valueInputError : null
						]}
						placeholder="valeur"
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
				</View>
			) : (
				// Cycle : opérateur `=` implicite (masqué), valeur ON/OFF.
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
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	// Contenu calé sous l'icône de l'en-tête (marginLeft: 10 du MenuAccordion).
	wrap: {paddingLeft: 10, paddingRight: 10, paddingTop: 6, paddingBottom: 14},
	title: {fontSize: 15, color: C.text, fontWeight: 'bold', marginBottom: 10},
	// Bouton d'ajout de groupe aligné sur « Add new sequence » : icône
	// FontAwesome5 « times-circle » tournée à 135° (= un +) + libellé.
	addButtonWrapper: {justifyContent: 'center', alignItems: 'center'},
	addButton: {marginTop: 20, transform: [{rotate: '135deg'}]},
	addLabel: {color: C.accent, fontSize: 15},
	// Bouton générique aligné sur le style de l'app (cf. chips/segments) :
	// fond blanc, bordure #CBD5E0, coins arrondis, icône + libellé slate.
	btn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 9,
		paddingHorizontal: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface
	},
	btnDanger: {paddingHorizontal: 12, borderColor: '#FEB2B2'},
	btnTxt: {fontSize: 13, color: C.text, fontWeight: '600'},
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
	// et même format que l'input à côté (hauteur 50, coins 12).
	typeBtn: {
		height: 50,
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
	condDelete: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	valueInput: {
		flex: 1.5,
		height: 50,
		marginVertical: 4,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		color: C.text,
		fontSize: 15,
		fontWeight: 'bold'
	},
	valueInputError: {borderWidth: 2, borderColor: C.errorBorder},
	actions: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
	hint: {fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 17}
});

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps)(ConditionBuilderSection);
