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
import {DropdownSelect} from '../../../components/common/FormComponents';
import {placeholderColor} from '../../../styles/components/common/Input';

/**
 * ConditionBuilderSection — constructeur de conditions imbriquées.
 *
 * Portage fidèle du mockup HTML fourni : chaque groupe est une parenthèse, avec
 * un connecteur ET/OU basculable entre deux éléments, des conditions
 * (champ / opérateur / valeur) et des sous-groupes récursifs.
 *
 * Pour l'instant c'est un builder autonome (visuel) : il maintient l'arbre de
 * conditions en état local, sans être branché à la sauvegarde de la condition.
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

function maxId(node: BuilderNode): number {
	if (node.type !== 'group') return node.id;
	return node.children.reduce((m, c) => Math.max(m, maxId(c)), node.id);
}

// Nombre total de groupes dans l'arbre (racine incluse). Sert à interdire la
// suppression du dernier groupe restant.
function countGroups(node: BuilderNode): number {
	if (node.type !== 'group') return 0;
	return node.children.reduce((s, c) => s + countGroups(c), 1);
}

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
		value: ''
	});
	const newGroup = (children?: BuilderNode[]): GroupNode => ({
		type: 'group',
		id: genId(),
		connector: 'ET',
		children: children ?? [newCondition()]
	});

	// Arbre maintenu dans un ref (mutations directes façon mockup), avec un
	// compteur de version pour forcer le rendu.
	const rootRef = React.useRef<GroupNode | undefined>(undefined);
	if (!rootRef.current) {
		const seed = props.value as GroupNode | undefined;
		if (seed) {
			uidRef.current = maxId(seed) + 1;
			rootRef.current = seed;
		} else {
			rootRef.current = newGroup([newCondition()]);
		}
	}
	const root = rootRef.current;

	const [, setVersion] = React.useState(0);
	const notify = () => {
		setVersion(v => v + 1);
		props.onChange?.(root);
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
	onChange,
	onRemove
}: {
	cond: ConditionNode;
	cycles: any[];
	sensors: any[];
	onChange: () => void;
	onRemove: (id: number) => void;
}) {
	const isSensor = cond.elementType === 'SENSOR';
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
						hasError={false}
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
							hasError={false}
						/>
					</View>
					<TextInput
						style={styles.valueInput}
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
					hasError={false}
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
	actions: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
	hint: {fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 17}
});

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps)(ConditionBuilderSection);
