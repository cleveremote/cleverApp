import React, {useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	Pressable,
	StyleSheet,
	Switch,
	Text,
	TextInput,
	View
} from 'react-native';
import {connect} from 'react-redux';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../data/cycleTypes';
import {executeDeviceCommand} from '../../../../module/process/infrasctructure/store/actions/device';

// Formulaire d'exécution d'une device command, construit depuis ses `params` :
//  - `{type: 'enum', entries}`         → choix parmi les libellés ;
//  - `range: {min, max, labelStart}`   → plage « de / à » ;
//  - `{min, max, labelStart}`          → un index (voie…) ;
//  - `{type: 'boolean'}`               → interrupteur ;
//  - autre `{type}`                    → saisie libre (numérique si `number`).
// `result`, `isConfirmRequired` et `isPersistable` décrivent la commande et ne
// sont pas saisis. Les index sont envoyés tels que définis (à partir de `min`)
// et affichés à partir de `labelStart`. Les valeurs initiales sont celles posées
// sur la commande (`command.channel`, `command.value`…).

const META_KEYS = ['result', 'isConfirmRequired', 'isPersistable'];
// Au-delà, un index se saisit au clavier plutôt qu'en pastilles.
const MAX_CHIPS = 16;
const EXECUTE_TIMEOUT_MS = 10000;

type InputKind = 'enum' | 'range' | 'index' | 'boolean' | 'number' | 'text';

const isObject = (x: any) => x !== null && typeof x === 'object';
const hasBounds = (spec: any) => spec?.min != null && spec?.max != null;

const inputKind = (key: string, spec: any): InputKind => {
	if (spec?.type === 'enum') return 'enum';
	if (key === 'range' && hasBounds(spec)) return 'range';
	if (hasBounds(spec)) return 'index';
	if (spec?.type === 'boolean') return 'boolean';
	if (spec?.type === 'number') return 'number';
	return 'text';
};

const defaultValue = (command: any, key: string, spec: any) => {
	if (command?.[key] !== undefined) return command[key];
	if (spec?.default !== undefined) return spec.default;
	switch (inputKind(key, spec)) {
		case 'enum':
			return spec.entries?.[0]?.value;
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

function Chips({
	options,
	selected,
	onSelect
}: Readonly<{
	options: {label: string; value: any}[];
	selected: any;
	onSelect: (value: any) => void;
}>) {
	return (
		<View style={styles.chips}>
			{options.map(o => {
				const active = `${o.value}` === `${selected}`;
				return (
					<Pressable
						key={`${o.value}`}
						onPress={() => onSelect(o.value)}
						style={[styles.chip, active && styles.chipActive]}
					>
						<Text
							style={[
								styles.chipText,
								active && styles.chipTextActive
							]}
						>
							{o.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

// Un index compris entre `spec.min` et `spec.max`, affiché à partir de
// `labelStart` : en pastilles s'il y en a peu, au clavier sinon.
function IndexInput({
	spec,
	value,
	onChange
}: Readonly<{spec: any; value: any; onChange: (value: any) => void}>) {
	const count = spec.max - spec.min + 1;
	if (count <= MAX_CHIPS) {
		const options = Array.from({length: count}, (_, i) => ({
			label: `${labelOf(spec.min + i, spec)}`,
			value: spec.min + i
		}));
		return <Chips options={options} selected={value} onSelect={onChange} />;
	}
	return (
		<TextInput
			style={styles.input}
			keyboardType="numeric"
			defaultValue={value == null ? '' : `${labelOf(value, spec)}`}
			placeholder={`${labelOf(spec.min, spec)} – ${labelOf(
				spec.max,
				spec
			)}`}
			onChangeText={text => {
				const n = Number(text);
				onChange(
					text === '' || isNaN(n)
						? undefined
						: n - (spec.labelStart ?? 0)
				);
			}}
		/>
	);
}

const inRange = (value: any, spec: any) =>
	typeof value === 'number' && value >= spec.min && value <= spec.max;

// Message d'erreur du paramètre, ou undefined s'il est valide.
const validate = (kind: InputKind, spec: any, value: any) => {
	if (kind === 'index' && !inRange(value, spec)) {
		return `Between ${labelOf(spec.min, spec)} and ${labelOf(
			spec.max,
			spec
		)}`;
	}
	if (kind === 'range') {
		if (!inRange(value?.min, spec) || !inRange(value?.max, spec)) {
			return `Between ${labelOf(spec.min, spec)} and ${labelOf(
				spec.max,
				spec
			)}`;
		}
		if (value.min > value.max) return '"From" must be before "To"';
	}
	if (kind === 'number' && (value === undefined || isNaN(value))) {
		return 'A number is required';
	}
	return undefined;
};

export function CommandExecuteForm(props: any) {
	const {command, deviceId} = props;
	const params = command?.params ?? {};
	const inputs = Object.entries(params)
		.filter(([key, spec]) => !META_KEYS.includes(key) && isObject(spec))
		.map(([key, spec]: [string, any]) => ({
			key,
			spec,
			kind: inputKind(key, spec)
		}));
	const resultFields: any[] =
		params.result?.type === 'fields' ? params.result.fields ?? [] : [];

	const [values, setValues] = useState<Record<string, any>>(() =>
		Object.fromEntries(
			inputs.map(({key, spec}) => [key, defaultValue(command, key, spec)])
		)
	);
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<{error?: string; data?: any}>();
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(
		() => () => {
			if (timeout.current) clearTimeout(timeout.current);
		},
		[]
	);

	const setValue = (key: string, value: any) =>
		setValues(prev => ({...prev, [key]: value}));

	const errors = Object.fromEntries(
		inputs.map(({key, spec, kind}) => [
			key,
			validate(kind, spec, values[key])
		])
	);
	const isValid = Object.values(errors).every(e => !e);

	// Params envoyés : les params fixes (non objets) de la définition, puis
	// les valeurs saisies dans le formulaire.
	const buildParams = () => ({
		...Object.fromEntries(
			Object.entries(params).filter(
				([key, spec]) => !META_KEYS.includes(key) && !isObject(spec)
			)
		),
		...values
	});

	const run = (payload: {
		deviceId: string;
		commandId: string;
		params: Record<string, any>;
	}) => {
		console.log('[executeDeviceCommand]', JSON.stringify(payload));
		setRunning(true);
		setResult(undefined);
		timeout.current = setTimeout(() => {
			timeout.current = null;
			setRunning(false);
			setResult({error: 'The box did not answer.'});
		}, EXECUTE_TIMEOUT_MS);
		props.executeDeviceCommand(payload, (response: any) => {
			// Réponse arrivée après le garde-fou : déjà signalée.
			if (!timeout.current) return;
			clearTimeout(timeout.current);
			timeout.current = null;
			setRunning(false);
			if (response?.error) {
				setResult({
					error: `${response.error.message ?? response.error}`
				});
			} else {
				setResult({
					data:
						response?.result ??
						response?.values ??
						response?.data ??
						response
				});
			}
		});
	};

	const onExecute = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (!deviceId) {
			Alert.alert('Unknown device', 'This device has no id yet.');
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
			Alert.alert('Execute command', `Execute "${command.name}"?`, [
				{text: 'Cancel', style: 'cancel'},
				{
					text: 'Execute',
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

	const renderInput = ({key, spec, kind}: (typeof inputs)[number]) => {
		const value = values[key];
		switch (kind) {
			case 'enum':
				return (
					<Chips
						options={(spec.entries ?? []).map((e: any) => ({
							label: e.label ?? `${e.value}`,
							value: e.value
						}))}
						selected={value}
						onSelect={v => setValue(key, v)}
					/>
				);
			case 'index':
				return (
					<IndexInput
						spec={spec}
						value={value}
						onChange={v => setValue(key, v)}
					/>
				);
			case 'range':
				return (
					<View>
						<Text style={styles.subLabel}>From</Text>
						<IndexInput
							spec={spec}
							value={value?.min}
							onChange={v => setValue(key, {...value, min: v})}
						/>
						<Text style={styles.subLabel}>To</Text>
						<IndexInput
							spec={spec}
							value={value?.max}
							onChange={v => setValue(key, {...value, max: v})}
						/>
					</View>
				);
			case 'boolean':
				return (
					<Switch
						value={!!value}
						onValueChange={v => setValue(key, v)}
					/>
				);
			case 'number':
				return (
					<TextInput
						style={styles.input}
						keyboardType="numeric"
						defaultValue={value == null ? '' : `${value}`}
						onChangeText={text =>
							setValue(
								key,
								text === '' ? undefined : Number(text)
							)
						}
					/>
				);
			default:
				return (
					<TextInput
						style={styles.input}
						defaultValue={value == null ? '' : `${value}`}
						onChangeText={text => setValue(key, text)}
					/>
				);
		}
	};

	const renderResult = () => {
		if (!result) return null;
		if (result.error) {
			return (
				<Text style={[styles.result, styles.resultError]}>
					{result.error}
				</Text>
			);
		}
		const data = result.data;
		if (resultFields.length && isObject(data)) {
			return (
				<View style={styles.result}>
					{resultFields.map((f: any) => (
						<View key={f.name} style={styles.resultRow}>
							<Text style={styles.resultLabel}>
								{f.label || f.name}
							</Text>
							<Text style={styles.resultValue}>
								{formatResultValue(data[f.name], f)}
							</Text>
						</View>
					))}
				</View>
			);
		}
		const hasPayload =
			data !== undefined &&
			data !== null &&
			!(isObject(data) && Object.keys(data).length === 0) &&
			data !== true;
		return (
			<Text style={[styles.result, styles.resultOk]}>
				{hasPayload ? formatResultValue(data) : 'Command sent'}
			</Text>
		);
	};

	return (
		<View style={styles.form}>
			<Text style={styles.title}>Test</Text>
			{inputs.map(input => (
				<View key={input.key} style={styles.field}>
					<Text style={styles.label}>{input.key}</Text>
					{renderInput(input)}
					{errors[input.key] ? (
						<Text style={styles.error}>{errors[input.key]}</Text>
					) : null}
				</View>
			))}
			<Pressable
				onPress={onExecute}
				disabled={running || !isValid}
				style={({pressed}) => [
					styles.button,
					{opacity: running || !isValid ? 0.5 : pressed ? 0.7 : 1}
				]}
			>
				{running ? (
					<ActivityIndicator size="small" color={COLORS.onPrimary} />
				) : (
					<>
						<Icon name="play" size={12} color={COLORS.onPrimary} />
						<Text style={styles.buttonText}>Execute</Text>
					</>
				)}
			</Pressable>
			{renderResult()}
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	onPrimary: 'white',
	muted: '#8a96a3',
	border: '#e5e7eb',
	chip: '#eef1f4',
	error: '#d9534f',
	ok: '#2e7d32'
};

const styles = StyleSheet.create({
	form: {
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: COLORS.border
	},
	title: {color: COLORS.primary, fontWeight: 'bold', fontSize: 14},
	field: {marginTop: 8},
	label: {color: COLORS.muted, fontSize: 13, marginBottom: 4},
	subLabel: {color: COLORS.muted, fontSize: 12, marginVertical: 4},
	chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
	chip: {
		backgroundColor: COLORS.chip,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		minWidth: 36,
		alignItems: 'center'
	},
	chipActive: {backgroundColor: COLORS.primary},
	chipText: {color: COLORS.primary, fontSize: 13},
	chipTextActive: {color: COLORS.onPrimary, fontWeight: '600'},
	input: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		color: COLORS.primary
	},
	error: {color: COLORS.error, fontSize: 12, marginTop: 4},
	button: {
		marginTop: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: COLORS.primary,
		borderRadius: 10,
		paddingVertical: 10
	},
	buttonText: {color: COLORS.onPrimary, fontWeight: '600', fontSize: 15},
	result: {marginTop: 10},
	resultError: {color: COLORS.error},
	resultOk: {color: COLORS.ok},
	resultRow: {flexDirection: 'row', paddingVertical: 3},
	resultLabel: {flex: 1, color: COLORS.muted},
	resultValue: {color: COLORS.primary, fontWeight: '600'}
});

export default connect(null, {executeDeviceCommand})(CommandExecuteForm);
