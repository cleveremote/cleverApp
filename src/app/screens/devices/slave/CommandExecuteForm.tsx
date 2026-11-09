import {fieldLabelColor,fieldLabelText,inputText} from '../../../styles/components/common/Input';
import React, {useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View
} from 'react-native';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../data/cycleTypes';
import {executeDeviceCommand} from '../../../../module/process/infrasctructure/store/actions/device';
import {
	faClipboardCheck,
	faFlask,
	faPlay
} from '@fortawesome/free-solid-svg-icons';
import {
	MenuAccordion,
	MenuGroup
} from '../../../components/common/cycleMenu';
import {DropdownSelect} from '../../../components/common/FormComponents';
import {OutlineButton} from '../../access/accessUi';
import {InfoBox} from '../../../components/common/InfoBox';
import {ErrorBox} from '../../../components/common/ErrorBox';
import {SuccessBox} from '../../../components/common/SuccessBox';
import i18n from 'i18next';

// Formulaire d'exécution d'une device command, construit depuis ses `params`
// (tout choix se fait en liste déroulante) :
//  - `{type: 'enum', entries}`         → choix parmi les libellés ;
//  - `{type: 'enum[]', enum, length}`  → un choix par port (la première entrée
//    à défaut de `default`), envoyé
//    en tableau de `length` valeurs (`input` de la commande) ;
//  - `{type: 'boolean[]'}`             → idem avec OFF / ON ;
//    sans `length`, un tableau suit la plage `range` choisie : une ligne par
//    canal de « de » à « à » ;
//  - `range: {min, max, labelStart}`   → plage « de / à » ;
//  - `{min, max, labelStart}`          → un index (voie…) ;
//  - `{type: 'boolean'}`               → interrupteur ;
//  - `{type: 'composite', …}`          → un groupe de sous-champs, chacun
//    décrit comme ci-dessus (`fields: [{name, …}]`, `properties: {nom: …}` ou
//    directement en clés), envoyé en objet `{nom: valeur}` ;
//  - autre `{type}`                    → saisie libre (numérique si `number`).
// Un enum peut porter ses `entries` ou les nommer (`enum: 'outputMode'`) : la
// liste est alors cherchée dans le modèle.
// `result`, `isConfirmRequired` et `isPersistable` décrivent la commande et ne
// sont pas saisis. Les index sont envoyés tels que définis (à partir de `min`)
// et affichés à partir de `labelStart`. Les valeurs initiales sont celles posées
// sur la commande (`command.channel`, `command.value`…).

const META_KEYS = ['result', 'isConfirmRequired', 'isPersistable'];
const EXECUTE_TIMEOUT_MS = 10000;

type InputKind =
	| 'enum'
	| 'enumArray'
	| 'range'
	| 'index'
	| 'boolean'
	| 'number'
	| 'composite'
	| 'text';

type EnumEntry = {label: string; value: any; description?: string};

const isObject = (x: any) => x !== null && typeof x === 'object';
const hasBounds = (spec: any) => spec?.min != null && spec?.max != null;

const inputKind = (key: string, spec: any): InputKind => {
	if (spec?.type === 'composite') return 'composite';
	if (spec?.type === 'enum[]' || spec?.type === 'boolean[]') return 'enumArray';
	// Un champ qui porte ses `entries` est un enum, même sans `type`.
	if (spec?.type === 'enum' || (spec?.type === undefined && spec?.entries)) {
		return 'enum';
	}
	if (key === 'range' && hasBounds(spec)) return 'range';
	if (hasBounds(spec)) return 'index';
	if (spec?.type === 'boolean') return 'boolean';
	if (spec?.type === 'number') return 'number';
	return 'text';
};

// Une clé d'enum numérique (`{"0": "OFF"}`) redevient un nombre.
const enumKey = (key: string) =>
	key !== '' && !isNaN(Number(key)) ? Number(key) : key;

// Normalise une définition d'enum : `[{value, label}]`, `[valeur]`,
// `{entries: [...]}` ou `{valeur: libellé}`.
const toEntries = (def: any): EnumEntry[] | undefined => {
	if (Array.isArray(def)) {
		return def.map((e: any) =>
			isObject(e)
				? {
						label: `${e.label ?? e.name ?? e.value}`,
						value: e.value,
						description: e.description
				  }
				: {label: `${e}`, value: e}
		);
	}
	if (Array.isArray(def?.entries)) return toEntries(def.entries);
	if (isObject(def)) {
		return Object.entries(def).map(([k, label]) => ({
			label: `${label}`,
			value: enumKey(k)
		}));
	}
	return undefined;
};

// Enum nommé `name` dans une portée : ses `enums`, ou ses `entries` quand
// elles sont un objet indexé par nom d'enum.
const enumIn = (scope: any, name: string) =>
	scope?.enums?.[name] ??
	(isObject(scope?.entries) && !Array.isArray(scope.entries)
		? scope.entries[name]
		: undefined);

// Entrées d'un enum : les siennes, sinon celles de l'enum nommé (`enum`, à
// défaut le nom du champ) cherché dans les `scopes` — du composite parent le
// plus proche jusqu'à la commande — puis dans le modèle.
const resolveEnum = (
	spec: any,
	model: any,
	scopes: any[] = [],
	key?: string
): EnumEntry[] | undefined => {
	if (spec?.entries) return toEntries(spec.entries);
	if (spec?.enum !== undefined && typeof spec.enum !== 'string') {
		return toEntries(spec.enum);
	}
	const name = spec?.enum ?? key;
	if (!name) return undefined;
	const def = [...scopes, model, model?.device, model?.params]
		.map(scope => enumIn(scope, name))
		.find(d => d !== undefined);
	return toEntries(def);
};

// Champ du formulaire ; un composite porte ses sous-champs dans `children`.
type Field = {
	key: string;
	label: string;
	spec: any;
	kind: InputKind;
	entries?: EnumEntry[];
	length?: number;
	children?: Field[];
};

// Clés descriptives d'un composite décrit directement en clés (ses `enums` /
// `entries` servent aux sous-champs enum, ce ne sont pas des sous-champs).
const COMPOSITE_META = [
	'type',
	'label',
	'name',
	'description',
	'default',
	'enums',
	'entries'
];

// Sous-champs d'un composite : `fields` (liste de `{name, …}`), `properties`
// (objet `{nom: spec}`), sinon ses propres clés objet.
const compositeFields = (spec: any): [string, any][] => {
	const def = spec?.fields ?? spec?.properties;
	if (Array.isArray(def)) {
		return def
			.filter(isObject)
			.map((f: any, i: number) => [`${f.name ?? f.key ?? i}`, f]);
	}
	const source = isObject(def) ? def : spec;
	return Object.entries(source ?? {}).filter(
		([key, sub]) =>
			isObject(sub) && (source !== spec || !COMPOSITE_META.includes(key))
	);
};

// `scopes` : où chercher les enums nommés (composites parents, commande).
const buildField = (
	key: string,
	spec: any,
	model: any,
	scopes: any[],
	length?: number
): Field => {
	const kind = inputKind(key, spec);
	return {
		key,
		label: `${spec?.label ?? key}`,
		spec,
		kind,
		entries:
			spec?.type === 'boolean[]'
				? BOOLEAN_ENTRIES
				: kind === 'enum' || kind === 'enumArray'
				? resolveEnum(spec, model, scopes, key)
				: undefined,
		length: kind === 'enumArray' ? spec.length ?? length : undefined,
		children:
			kind === 'composite'
				? compositeFields(spec).map(([k, sub]) =>
						buildField(k, sub, model, [spec, ...scopes])
				  )
				: undefined
	};
};

const BOOLEAN_ENTRIES: EnumEntry[] = [
	{label: 'OFF', value: false},
	{label: 'ON', value: true}
];

// Valeur par défaut de la case `i` d'un tableau : le `default` de la
// définition (tableau ou valeur commune), sinon la première entrée (OFF pour
// un boolean[]).
const itemDefault = (field: Field, i: number) => {
	const def = field.spec?.default;
	const own = Array.isArray(def) ? def[i] : def;
	return own !== undefined ? own : field.entries?.[0]?.value;
};

// Tableau de `length` cases : les valeurs saisies, complétées par le défaut.
const fillArray = (field: Field, value: any, length: number) =>
	Array.from({length}, (_, i) => value?.[i] ?? itemDefault(field, i));

// Valeur initiale : `initial` (posée sur la commande), sinon le `default` de
// la définition, sinon une valeur neutre selon le type.
const defaultValue = (field: Field, initial: any): any => {
	const {spec, kind, entries, length} = field;
	if (kind === 'composite') {
		return Object.fromEntries(
			(field.children ?? []).map(c => [
				c.key,
				defaultValue(c, isObject(initial) ? initial[c.key] : undefined)
			])
		);
	}
	// Un tableau se choisit case par case (sa longueur peut suivre la plage :
	// complété à l'affichage).
	if (kind === 'enumArray') {
		return fillArray(field, undefined, length ?? 0);
	}
	if (initial !== undefined) return initial;
	if (spec?.default !== undefined) return spec.default;
	switch (kind) {
		case 'enum':
			return entries?.[0]?.value;
		case 'range':
			return {min: spec.min, max: spec.max};
		case 'index':
			return spec.min;
		case 'boolean':
			return false;
		default:
			return undefined;
	}
};

const labelOf = (index: number, spec: any) => index + (spec?.labelStart ?? 0);

const formatResultValue = (value: any, field?: any) => {
	if (value === undefined || value === null) return '—';
	if (typeof value === 'boolean') return value ? 'ON' : 'OFF';
	if (isObject(value)) return JSON.stringify(value);
	return `${value}${field?.unit ? ` ${field.unit}` : ''}`;
};

// Rapport d'exécution renvoyé par la box dans `response.config` (JSON) :
// `{isOk, value, raw, request, durationMs, error?}`. `value` est soit
// `{type: 'fields', fields: [{name, label, raw, value}]}`, soit une autre
// forme (`echo`, valeur simple) affichée telle quelle.
const parseReport = (response: any) => {
	let report = response?.config ?? response;
	if (typeof report === 'string') {
		try {
			report = JSON.parse(report);
		} catch {
			// Réponse non JSON : affichée brute.
		}
	}
	return report;
};

const errorMessage = (report: any) => {
	const err = report?.error ?? report?.message;
	return `${err?.message ?? err ?? i18n.t('devices:command.failed')}`;
};

// Requête Modbus jouée, ex. « readHoldingRegisters @5 ×1 ».
const describeRequest = (request: any) =>
	request
		? [
				request.function,
				request.address != null ? `@${request.address}` : undefined,
				request.length != null ? `×${request.length}` : undefined
		  ]
				.filter(Boolean)
				.join(' ')
		: undefined;

type SelectOption = {label: string; value: any; iconColor?: {base: string}};

// Choix parmi des options : liste déroulante (la valeur reste typée, ex. un
// nombre pour un index).
function Select({
	options,
	value,
	onChange
}: Readonly<{
	options: SelectOption[];
	value: any;
	onChange: (value: any) => void;
}>) {
	return (
		<DropdownSelect
			items={options}
			value={value}
			getLabel={o => o.label}
			getValue={o => o.value}
			onChange={onChange}
			hasError={false}
		/>
	);
}

// Index compris entre `spec.min` et `spec.max`, affichés à partir de
// `labelStart`.
const indexOptions = (spec: any): SelectOption[] =>
	Array.from({length: spec.max - spec.min + 1}, (_, i) => ({
		label: `${labelOf(spec.min + i, spec)}`,
		value: spec.min + i
	}));

const inRange = (value: any, spec: any) =>
	typeof value === 'number' && value >= spec.min && value <= spec.max;

// Message d'erreur du paramètre, ou undefined s'il est valide.
const validate = (
	kind: InputKind,
	spec: any,
	value: any,
	entries?: EnumEntry[],
	length?: number
) => {
	if ((kind === 'enum' || kind === 'enumArray') && !entries?.length) {
		return spec?.enum
			? i18n.t('devices:command.unknownListNamed', {name: spec.enum})
			: i18n.t('devices:command.unknownList');
	}
	if (kind === 'enumArray') {
		const chosen = (value ?? []).filter((v: any) => v !== undefined).length;
		if (!length) return i18n.t('devices:command.unknownLength');
		if (chosen < length) {
			return i18n.t('devices:command.choosePorts', {chosen, length});
		}
	}
	if (kind === 'index' && !inRange(value, spec)) {
		return i18n.t('devices:command.between', {
			min: labelOf(spec.min, spec),
			max: labelOf(spec.max, spec)
		});
	}
	if (kind === 'range') {
		if (!inRange(value?.min, spec) || !inRange(value?.max, spec)) {
			return i18n.t('devices:command.between', {
				min: labelOf(spec.min, spec),
				max: labelOf(spec.max, spec)
			});
		}
		if (value.min > value.max) return i18n.t('devices:command.fromBeforeTo');
	}
	if (kind === 'number' && (value === undefined || isNaN(value))) {
		return i18n.t('devices:command.numberRequired');
	}
	return undefined;
};

// Plage « de / à » : deux listes déroulantes côte à côte, libellé à leur
// gauche (index entre `spec.min` et `spec.max`, affichés à partir de
// `labelStart`), suivies de `trailing` éventuel.
function RangeSelect({
	spec,
	value,
	onChange,
	trailing
}: Readonly<{
	spec: any;
	value: any;
	onChange: (value: any) => void;
	trailing?: React.ReactNode;
}>) {
	const options = indexOptions(spec);
	const select = (bound: 'min' | 'max', title: string) => (
		<View style={styles.rangeSelect}>
			<Text style={styles.rangeLabel}>{title}</Text>
			<View style={styles.rangeDropdown}>
				<Select
					options={options}
					value={value?.[bound]}
					onChange={v => onChange({...value, [bound]: v})}
				/>
			</View>
		</View>
	);
	return (
		<View style={styles.rangeRow}>
			{select('min', i18n.t('devices:command.from'))}
			{select('max', i18n.t('devices:command.to'))}
			{trailing}
		</View>
	);
}

// Un composite est valide si tous ses sous-champs le sont.
// `lengthOf` : longueur effective d'un tableau (fixe ou suivant la plage).
const fieldError = (
	field: Field,
	value: any,
	lengthOf: (field: Field) => number | undefined
) => {
	if (field.kind !== 'enumArray') {
		return validate(field.kind, field.spec, value, field.entries, field.length);
	}
	const length = lengthOf(field);
	return validate(
		field.kind,
		field.spec,
		fillArray(field, value, length ?? 0),
		field.entries,
		length
	);
};

const isFieldValid = (
	field: Field,
	value: any,
	lengthOf: (field: Field) => number | undefined
): boolean =>
	field.kind === 'composite'
		? (field.children ?? []).every(c =>
				isFieldValid(c, value?.[c.key], lengthOf)
		  )
		: !fieldError(field, value, lengthOf);

export function CommandExecuteForm(props: any) {
	const {command, deviceId, model} = props;
	const params = command?.params ?? {};
	// Premier numéro de port affiché pour un enum[] (un choix par port).
	const portStart = model?.device?.portConfig?.portNumStart ?? 1;
	// Libellé du canal i d'un enum[] : celui de `params.channel` s'il est
	// décrit (à partir de son `min` / `labelStart`), sinon le numéro de port.
	// Un tableau qui suit la plage numérote ses lignes à partir de « de ».
	// (`rangeField` / `range` : définis plus bas, lus au rendu.)
	const channelLabel = (field: Field, i: number) => {
		if (rangeField && range) {
			return `${labelOf(range.min + i, rangeField.spec)}`;
		}
		return hasBounds(params.channel)
			? `${labelOf(params.channel.min + i, params.channel)}`
			: i18n.t('devices:command.port', {number: portStart + i});
	};
	const specs: [string, any][] = Object.entries(params).filter(
		([key, spec]) => !META_KEYS.includes(key) && isObject(spec)
	);
	// La valeur à écrire peut être décrite hors des params (`command.input`).
	if (isObject(command?.input) && params.input === undefined) {
		specs.push(['input', command.input]);
	}
	const inputs = specs.map(([key, spec]) =>
		buildField(key, spec, model, [params, command], params.length)
	);
	const resultFields: any[] =
		params.result?.type === 'fields' ? params.result.fields ?? [] : [];

	const [values, setValues] = useState<Record<string, any>>(() =>
		Object.fromEntries(
			inputs.map(field => [
				field.key,
				// La valeur posée sur la commande, sauf si c'est la définition
				// elle-même (`command.input`).
				defaultValue(
					field,
					command?.[field.key] === field.spec
						? undefined
						: command?.[field.key]
				)
			])
		)
	);
	const [running, setRunning] = useState(false);
	// Section Test dépliée ; à chaque exécution elle se replie et la section
	// Résultat se déplie.
	const [open, setOpen] = useState(true);
	const [resultOpen, setResultOpen] = useState(true);
	const [result, setResult] = useState<{error?: string; report?: any}>();
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timeout.current) clearTimeout(timeout.current);
		},
		[]
	);

	// Remarque (`description`) de l'entrée choisie d'un champ à liste.
	const entryHint = (field: Field, value: any): string | undefined =>
		field.entries?.find(e => `${e.value}` === `${value}`)?.description;
	// Canal / valeur affichés sur une ligne commune (voir `paired`).
	const isPaired = (field: Field) =>
		!!paired && (field === paired.channel || field === paired.value);

	const setValue = (key: string, value: any) =>
		setValues(prev => ({...prev, [key]: value}));

	// Plage de la commande et sa valeur choisie, si elle est valide. Un tableau
	// suit la plage quand il y en a une (une ligne par canal de « de » à « à »,
	// même si sa définition a une `length`) ; sinon sa `length`.
	const rangeField = inputs.find(f => f.kind === 'range');
	const rangeValue = rangeField ? values[rangeField.key] : undefined;
	const range =
		typeof rangeValue?.min === 'number' &&
		typeof rangeValue?.max === 'number' &&
		rangeValue.min <= rangeValue.max
			? rangeValue
			: undefined;
	const lengthOf = (field: Field) => {
		if (rangeField) return range ? range.max - range.min + 1 : 0;
		return field.length;
	};

	const isValid = inputs.every(field =>
		isFieldValid(field, values[field.key], lengthOf)
	);

	// Params envoyés : les params fixes (non objets) de la définition, puis
	// les valeurs saisies dans le formulaire.
	const buildParams = () => ({
		...Object.fromEntries(
			Object.entries(params).filter(
				([key, spec]) => !META_KEYS.includes(key) && !isObject(spec)
			)
		),
		// Tableaux envoyés à leur longueur effective, cases non touchées
		// comprises.
		...Object.fromEntries(
			inputs.map(field => [
				field.key,
				field.kind === 'enumArray'
					? fillArray(field, values[field.key], lengthOf(field) ?? 0)
					: values[field.key]
			])
		)
	});

	const run = (payload: {
		deviceId: string;
		commandId: string;
		params: Record<string, any>;
	}) => {
		setOpen(false);
		setResultOpen(true);
		setRunning(true);
		setResult(undefined);
		timeout.current = setTimeout(() => {
			timeout.current = null;
			setRunning(false);
			setResult({error: i18n.t('devices:command.noAnswer')});
		}, EXECUTE_TIMEOUT_MS);
		props.executeDeviceCommand(payload, (response: any) => {
			// Réponse arrivée après le garde-fou : déjà signalée.
			if (!timeout.current) return;
			clearTimeout(timeout.current);
			timeout.current = null;
			setRunning(false);
			const report = parseReport(response);
			if (report?.isOk === false || response?.error) {
				setResult({
					error: errorMessage(report?.error ? report : response)
				});
			} else {
				setResult({report});
			}
		});
	};

	const commandName = command?.name ?? command?.label;

	const onExecute = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (!deviceId) {
			Alert.alert(
				i18n.t('devices:command.unknownDevice'),
				i18n.t('devices:command.noId')
			);
			return;
		}
		// Payload figé au clic : la confirmation envoie exactement ce qui était
		// saisi, sans dépendre de la closure du rendu au moment du « Execute ».
		const payload = {
			deviceId,
			commandId: command.id,
			params: buildParams()
		};
		if (params.isConfirmRequired) {
			Alert.alert(
				i18n.t('devices:command.executeTitle'),
				i18n.t('devices:command.executeMessage', {name: commandName}),
				[
				{text: i18n.t('common:cancel'), style: 'cancel'},
				{
					text: i18n.t('common:execute'),
					// La box n'exécute une commande à confirmer que si elle
					// reçoit la confirmation de l'utilisateur.
					onPress: () =>
						run({
							...payload,
							params: {...payload.params, isConfirmed: true}
						})
				}
			]);
			return;
		}
		run(payload);
	};

	// Libellé, saisie et erreur d'un champ ; un composite affiche ses
	// sous-champs en retrait, chacun mis à jour dans l'objet du composite.
	// `trailing` : rendu à côté de la saisie d'un range (bouton Exécuter).
	const renderField = (
		field: Field,
		value: any,
		onChange: (value: any) => void,
		trailing?: React.ReactNode
	) => {
		// Un composite n'a pas d'erreur propre : chaque sous-champ affiche la
		// sienne.
		const error = fieldError(field, value, lengthOf);
		return (
			<View key={field.key} style={styles.field}>
				<Text style={styles.label}>{field.label}</Text>
				{renderInput(field, value, onChange, trailing)}
				{error ? <Text style={styles.error}>{error}</Text> : null}
			</View>
		);
	};

	const renderInput = (
		field: Field,
		value: any,
		onChange: (value: any) => void,
		trailing?: React.ReactNode
	): React.ReactNode => {
		const {spec, kind, entries} = field;
		// La saisie suivie de `trailing` (bouton Exécuter) sur la même ligne.
		const withTrailing = (node: React.ReactNode) =>
			trailing ? (
				<View style={styles.rangeRow}>
					<View style={styles.rowInput}>{node}</View>
					{trailing}
				</View>
			) : (
				node
			);
		switch (kind) {
			case 'composite': {
				// `trailing` descend sur le dernier sous-champ.
				const children = field.children ?? [];
				return (
					<View style={styles.composite}>
						{children.map((c, i) =>
							renderField(
								c,
								value?.[c.key],
								v => onChange({...value, [c.key]: v}),
								i === children.length - 1 ? trailing : undefined
							)
						)}
					</View>
				);
			}
			case 'enum': {
				// Remarque de l'entrée choisie (ex. réglage à vérifier) sous la
				// ligne ; pour canal + valeur, sous leur ligne commune.
				const hint = isPaired(field) ? undefined : entryHint(field, value);
				return (
					<View>
						{withTrailing(
							<Select
								options={entries ?? []}
								value={value}
								onChange={onChange}
							/>
						)}
						{hint ? <InfoBox message={hint} style={styles.hint} /> : null}
					</View>
				);
			}
			case 'enumArray': {
				// Longueur fixe (`length`) ou suivant la plage choisie.
				const count = lengthOf(field) ?? 0;
				const cells = fillArray(field, value, count);
				return (
					<View>
						{/* Une ligne par canal : canal en lecture seule, valeur en
						    liste déroulante. */}
						<View style={styles.portRow}>
							<Text style={[styles.portLabel, styles.portHeader]}>
								{i18n.t('sensor:dataSource.channel')}
							</Text>
							<Text style={styles.portHeader}>
								{i18n.t('sensor:dataSource.value')}
							</Text>
						</View>
						{cells.map((cell, i) => (
							<View key={i} style={styles.portRow}>
								<Text
									style={[
										styles.portLabel,
										cell === undefined && styles.portLabelMissing
									]}
								>
									{channelLabel(field, i)}
								</Text>
								<View style={{flex: 1}}>
									<Select
										options={entries ?? []}
										value={cell}
										onChange={v =>
											onChange(cells.map((c, j) => (j === i ? v : c)))
										}
									/>
								</View>
							</View>
						))}
						{/* Remarques des valeurs choisies, une fois chacune. */}
						{[...new Set(cells.map(c => entryHint(field, c)))]
							.filter((h): h is string => !!h)
							.map(h => (
								<InfoBox key={h} message={h} style={styles.hint} />
							))}
						{/* Liste de longueur variable : `trailing` (bouton Exécuter)
						    tout à la fin, sous le dernier élément. */}
						{trailing ? <View style={styles.arrayButton}>{trailing}</View> : null}
					</View>
				);
			}
			case 'index':
				return withTrailing(
					<Select
						options={indexOptions(spec)}
						value={value}
						onChange={onChange}
					/>
				);
			case 'range':
				return (
					<RangeSelect
						spec={spec}
						value={value}
						onChange={onChange}
						trailing={trailing}
					/>
				);
			case 'boolean':
				return withTrailing(
					<Switch
						value={!!value}
						onValueChange={v => onChange(v)}
					/>
				);
			case 'number':
				return withTrailing(
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						defaultValue={value == null ? '' : `${value}`}
						onChangeText={text =>
							onChange(text === '' ? undefined : Number(text))
						}
					/>
				);
			default:
				return withTrailing(
					<TextInput
						style={styles.input}
						defaultValue={value == null ? '' : `${value}`}
						onChangeText={text => onChange(text)}
					/>
				);
		}
	};

	// Unité d'un champ lu : celle de sa définition dans `params.result`.
	const fieldDef = (name: string) =>
		resultFields.find((f: any) => f.name === name);

	const renderValue = (value: any) => {
		if (value?.type === 'fields' && Array.isArray(value.fields)) {
			return value.fields.map((f: any) => {
				const def = fieldDef(f.name);
				return (
					<View key={f.name} style={styles.resultRow}>
						<Text style={styles.resultLabel}>
							{f.label || def?.label || f.name}
						</Text>
						<Text style={styles.resultValue}>
							{formatResultValue(f.value, {
								unit: f.unit ?? def?.unit
							})}
						</Text>
					</View>
				);
			});
		}
		// Autres formes (`echo`…) : la valeur portée, sinon l'objet entier.
		const shown = isObject(value) && 'value' in value ? value.value : value;
		if (shown === undefined || shown === null) return null;
		return (
			<Text style={styles.resultValue}>{formatResultValue(shown)}</Text>
		);
	};

	// Statut dans une boîte verte (ou rouge en cas d'échec), valeurs lues et
	// détail technique dans une boîte d'information.
	const renderResult = () => {
		if (!result) return null;
		if (result.error) {
			return <ErrorBox message={result.error} style={styles.result} />;
		}
		const report = result.report;
		if (!isObject(report)) {
			return (
				<SuccessBox
					style={styles.result}
					message={
						report === undefined || report === null || report === true
							? i18n.t('devices:command.sent')
							: formatResultValue(report)
					}
				/>
			);
		}
		const request = describeRequest(report.request);
		const shownValue = renderValue(report.value);
		const technical =
			request || report.raw !== undefined
				? [
						request,
						report.raw !== undefined &&
							i18n.t('devices:command.raw', {
								value: JSON.stringify(report.raw)
							})
				  ]
						.filter(Boolean)
						.join(' · ')
				: undefined;
		return (
			<View style={styles.result}>
				<SuccessBox
					message={['OK', report.durationMs != null && `${report.durationMs} ms`]
						.filter(Boolean)
						.join(' · ')}
				/>
				{shownValue || technical ? (
					<InfoBox style={styles.resultBox}>
						{shownValue}
						{technical ? (
							<Text style={styles.resultTechnical}>{technical}</Text>
						) : null}
					</InfoBox>
				) : null}
			</View>
		);
	};

	// Le bouton se place sur la ligne de la dernière saisie, sinon (aucune
	// saisie) seul sous le titre.
	const besideKey = inputs[inputs.length - 1]?.key;
	// `channel` et `value` simples (un choix ou une saisie chacun) partagent une
	// ligne.
	const SINGLE_LINE: InputKind[] = ['enum', 'index', 'boolean', 'number', 'text'];
	const channelField = inputs.find(f => f.key === 'channel');
	const valueField = inputs.find(f => f.key === 'value');
	const paired =
		channelField &&
		valueField &&
		SINGLE_LINE.includes(channelField.kind) &&
		SINGLE_LINE.includes(valueField.kind)
			? {channel: channelField, value: valueField}
			: undefined;
	const pairedLast =
		!!paired && (besideKey === 'channel' || besideKey === 'value');
	const executeButton = (
		<OutlineButton
			icon={faPlay}
			accessibilityLabel={i18n.t('common:execute')}
			busy={running}
			disabled={!isValid}
			onPress={onExecute}
			style={[styles.executeButton, !besideKey && styles.executeButtonBelow]}
		/>
	);

	// Saisies de la commande et bouton Exécuter (section dépliée).
	const renderInputs = () => (
		<>
			{inputs.map(field => {
				if (paired && field === paired.value) return null;
				if (paired && field === paired.channel) {
					// Canal et valeur côte à côte, bouton au bout de la ligne
					// s'ils sont la dernière saisie.
					const hints = [paired.channel, paired.value]
						.map(f => entryHint(f, values[f.key]))
						.filter((h): h is string => !!h);
					return (
						<View key="channel-value">
							<View style={styles.pairRow}>
								{[paired.channel, paired.value].map(f => (
									<View key={f.key} style={styles.rowInput}>
										{renderField(f, values[f.key], v =>
											setValue(f.key, v)
										)}
									</View>
								))}
								{pairedLast ? (
									<View style={styles.pairButton}>{executeButton}</View>
								) : null}
							</View>
							{/* Remarques des valeurs choisies, sous la ligne canal +
							    valeur + exécuter. */}
							{hints.map(h => (
								<InfoBox key={h} message={h} style={styles.hint} />
							))}
						</View>
					);
				}
				return renderField(
					field,
					values[field.key],
					v => setValue(field.key, v),
					field.key === besideKey ? executeButton : undefined
				);
			})}
			{besideKey ? null : executeButton}
		</>
	);

	return (
		<View style={styles.form}>
			{/* Sections façon réglages : « Test » (saisies), replié à l'exécution,
			    et « Résultat », déplié dès qu'une exécution est lancée. */}
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key="test"
					name={i18n.t('devices:command.test')}
					icon={faFlask}
					expanded={open}
					onPress={() => setOpen(o => !o)}
				>
					<View style={styles.sectionBody}>{renderInputs()}</View>
				</MenuAccordion>
				{running || result ? (
					<MenuAccordion
						key="result"
						name={i18n.t('devices:command.result')}
						icon={faClipboardCheck}
						expanded={resultOpen}
						onPress={() => setResultOpen(o => !o)}
					>
						<View style={styles.sectionBody}>
							{running ? (
								<ActivityIndicator size="small" color={COLORS.primary} />
							) : (
								renderResult()
							)}
						</View>
					</MenuAccordion>
				) : null}
			</MenuGroup>
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	muted: fieldLabelColor,
	border: '#e5e7eb',
	error: '#d9534f',
	cardBackground: 'white',
	shadow: '#000'
};

const styles = StyleSheet.create({
	form: {marginTop: 12},
	// Même carte que les sections des écrans de réglages.
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	sectionBody: {paddingHorizontal: 12, paddingBottom: 12},
	field: {marginTop: 8},
	label: {...fieldLabelText, marginBottom: 4},
	hint: {marginTop: 6},
	arrayButton: {marginTop: 8, alignItems: 'flex-end'},
	composite: {
		paddingStart: 10,
		borderStartWidth: 2,
		borderStartColor: COLORS.border
	},
	portRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 4
	},
	portLabel: {width: 60, color: COLORS.primary, fontSize: 13},
	portLabelMissing: {color: COLORS.error},
	portHeader: {color: COLORS.muted, fontSize: 12},
	input: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		...inputText
	},
	error: {color: COLORS.error, fontSize: 12, marginTop: 4},
	// Bouton icône seule : carré, à côté des roues du range.
	executeButton: {
		marginTop: 0,
		width: 45,
		justifyContent: 'center',
		paddingHorizontal: 0
	},
	executeButtonBelow: {marginTop: 12},
	rangeRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
	rowInput: {flex: 1},
	// Canal + valeur : alignés en bas (libellés au-dessus des saisies).
	pairRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 8},
	// Même marge basse que les listes déroulantes pour s'aligner sur elles.
	pairButton: {marginBottom: 4},
	// Libellé « De » / « À » à gauche de sa liste.
	rangeSelect: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
	rangeLabel: {color: COLORS.primary, fontWeight: 'bold'},
	rangeDropdown: {flex: 1},
	result: {marginTop: 8},
	resultBox: {marginTop: 6},
	resultRow: {flexDirection: 'row', paddingVertical: 3},
	resultLabel: {flex: 1, color: COLORS.muted},
	resultTechnical: {color: COLORS.muted, fontSize: 11, marginTop: 4},
	resultValue: {color: COLORS.primary, fontWeight: '600'}
});

export default connect(null, {executeDeviceCommand})(CommandExecuteForm);
