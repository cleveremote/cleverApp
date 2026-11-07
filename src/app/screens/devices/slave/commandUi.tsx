import {fieldLabelColor} from '../../../styles/components/common/Input';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

// Éléments partagés par la liste des commandes d'un slave (SlaveModelSection)
// et leur popin (DeviceCommandModal). Module à part pour éviter un import
// circulaire entre les deux : les styles créés au chargement d'un module y
// verraient ces constantes encore indéfinies.

// Un index (voie, plage) est stocké à partir de 0 et affiché à partir de
// `labelStart`.
export const label = (index: number, spec: any) => index + (spec?.labelStart ?? 0);

export const formatRange = (spec: any) => {
	if (spec?.min == null || spec?.max == null) return undefined;
	const from = label(spec.min, spec);
	const to = label(spec.max, spec);
	return from === to ? `${from}` : `${from} – ${to}`;
};

export const enumLabel = (spec: any, value: any) =>
	(spec?.entries ?? []).find((e: any) => `${e.value}` === `${value}`)
		?.label ?? (value == null ? undefined : `${value}`);

export const formatValueSpec = (spec: any): string | undefined => {
	if (!spec) return undefined;
	// Composite : ses sous-champs, ex. « parity + baudRate ».
	if (spec.type === 'composite' && Array.isArray(spec.fields)) {
		return spec.fields
			.map((f: any) => f.label ?? f.name)
			.filter(Boolean)
			.join(' + ');
	}
	if (spec.type === 'enum' || (spec.type === undefined && spec.entries)) {
		return (spec.entries ?? []).map((e: any) => e.label).join(' / ');
	}
	const range = formatRange(spec);
	return [spec.type, range].filter(Boolean).join(' · ') || undefined;
};

// Sens d'une commande : d'abord ses `types` (`read…`/`get…`, `write…`/`set…`, puis
// `…INPUT`/`…OUTPUT`), sinon ses params (une valeur à envoyer = écriture, un
// `result` seul = lecture).
export type CommandAccess = 'read' | 'write';

export const commandAccess = (command: any): CommandAccess => {
	const types: string[] = (command?.types ?? []).map((t: any) =>
		`${t}`.toLowerCase()
	);
	const has = (word: string) => types.some(t => t.includes(word));
	if (has('write') || types.includes('set')) return 'write';
	if (has('read') || types.includes('get')) return 'read';
	if (has('output')) return 'write';
	if (has('input')) return 'read';
	const params = command?.params ?? {};
	if (params.value || params.input || command?.input || command?.value != null) {
		return 'write';
	}
	return params.result ? 'read' : 'write';
};

export const ACCESS_STYLE: Record<
	CommandAccess,
	{icon: string; color: string}
> = {
	read: {icon: 'eye', color: '#1e6fb8'},
	write: {icon: 'pen', color: '#f08c2e'}
};

// Commande à confirmer avant exécution : cercle en rouge.
export const CONFIRM_STYLE = {color: '#e8231a'};

export function AccessBadge({
	access,
	confirm
}: Readonly<{access: CommandAccess; confirm?: boolean}>) {
	const {icon} = ACCESS_STYLE[access];
	const {color} = confirm ? CONFIRM_STYLE : ACCESS_STYLE[access];
	// Seul le contour du cercle porte la couleur ; l'icône reste neutre.
	return (
		<View style={[styles.accessBadge, {borderColor: color}]}>
			<Icon name={icon} size={13} color={textColor} />
		</View>
	);
}

// `aside` : second couple icône / libellé / valeur sur la même ligne, juste
// après le premier. `labelWidth` : colonne libellé plus large, libellé sur
// une seule ligne (pas de retour à la ligne) ; 'auto' : libellés à la largeur
// de leur texte, même écart libellé / valeur pour chaque couple.
export function Row({
	icon,
	label: rowLabel,
	value,
	sub,
	aside,
	labelWidth
}: Readonly<{
	icon?: string;
	label: string;
	value?: string;
	sub?: string;
	aside?: {icon?: string; label: string; value?: string};
	labelWidth?: number | 'auto';
}>) {
	// Ligne à deux couples : tout tient sur une ligne, police réduite au besoin.
	const oneLine = aside
		? {numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.7}
		: {};
	const labelStyle = [
		styles.rowLabel,
		labelWidth === 'auto'
			? styles.rowLabelAuto
			: labelWidth
			? {width: labelWidth}
			: null
	];
	return (
		<View style={styles.row}>
			<View style={aside ? styles.rowPartFit : styles.rowPart}>
				<View style={styles.rowIcon}>
					{icon ? (
						<Icon name={icon} size={14} color={mutedColor} />
					) : null}
				</View>
				<Text
					{...oneLine}
					{...(labelWidth ? {numberOfLines: 1} : {})}
					style={labelStyle}>
					{rowLabel}
				</Text>
				<View style={aside ? styles.rowValueFit : {flex: 1}}>
					<Text {...oneLine} style={styles.rowValue}>
						{value || '—'}
					</Text>
					{sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
				</View>
			</View>
			{aside ? (
				<View style={[styles.rowPart, styles.rowAside]}>
					<View style={styles.rowIcon}>
						{aside.icon ? (
							<Icon name={aside.icon} size={14} color={mutedColor} />
						) : null}
					</View>
					<Text {...oneLine} style={labelStyle}>
						{aside.label}
					</Text>
					<Text {...oneLine} style={[styles.rowValue, {flex: 1}]}>
						{aside.value || '—'}
					</Text>
				</View>
			) : null}
		</View>
	);
}

export function Chip({text}: Readonly<{text: string}>) {
	return (
		<View style={styles.chip}>
			<Text style={styles.chipText}>{text}</Text>
		</View>
	);
}

const textColor = '#32404e';
// Couleur des libellés : source unique (Input.tsx).
const mutedColor = fieldLabelColor;
const COLORS = {
	chip: '#eef1f4'
};

const styles = StyleSheet.create({
	// textAlign 'left' = côté de début (inversé par RN en RTL) : sans lui, une
	// valeur latine resterait à gauche en arabe.
	row: {flexDirection: 'row', paddingVertical: 6},
	// Colonnes fixes (icône, libellé) : icônes, libellés et valeurs alignés
	// d'une ligne à l'autre.
	rowIcon: {width: 20, paddingTop: 2},
	rowLabel: {
		width: 64,
		marginEnd: 4,
		textAlign: 'left',
		color: mutedColor,
		fontSize: 14
	},
	// Largeur du texte : écart fixe (marginEnd) avec la valeur.
	rowLabelAuto: {width: 'auto', marginEnd: 8},
	rowValue: {textAlign: 'left', color: textColor, fontSize: 15, fontWeight: '600'},
	rowSub: {textAlign: 'left', color: mutedColor, fontSize: 12, marginTop: 2},
	rowPart: {flex: 1, flexDirection: 'row'},
	// Ligne à deux couples : le premier prend la largeur de son contenu, le
	// second (`aside`) le suit après un petit écart et prend le reste.
	rowPartFit: {flexShrink: 1, flexDirection: 'row'},
	rowValueFit: {flexShrink: 1},
	rowAside: {marginStart: 16},
	accessBadge: {
		width: 30,
		height: 30,
		borderRadius: 15,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center'
	},
	chip: {
		backgroundColor: COLORS.chip,
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2
	},
	chipText: {color: textColor, fontSize: 11},
});
