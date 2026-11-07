import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ELEMENT_HEIGHT} from '../../../styles/metrics';
import {fieldLabelText,inputText} from '../../../styles/components/common/Input';
import {COLORS} from '../../access/accessUi';
import {AppSwitch} from '../../../components/common/AppSwitch';

const INPUT_BORDER = '#CBD5E0';

// Libellé standard de l'application (comme ceux des formulaires de cycle).
// Libellés au format commun de l'application (fieldLabelText).
const labelText = fieldLabelText;

/** Carte des réglages utilisateur ; ses lignes se séparent par `RowDivider`. */
export const UserCard = ({children}: {children: React.ReactNode}) => (
	<View style={userStyles.card}>{children}</View>
);

export const RowDivider = () => <View style={userStyles.divider} />;

/**
 * Ligne pleine largeur : libellé, en dessous la valeur actuelle (`detail`,
 * ex. l'email masqué) et/ou une précision (`hint`), interrupteur à droite.
 * Les `children` (formulaire de modification) se déplient tant qu'il est
 * actif.
 */
export const ToggleRow = ({
	label,
	detail,
	hint,
	value,
	disabled = false,
	onToggle,
	children
}: {
	label: string;
	detail?: string;
	hint?: string;
	value: boolean;
	disabled?: boolean;
	onToggle: () => void;
	children?: React.ReactNode;
}) => (
	<View>
		<View style={userStyles.toggleRow}>
			<View style={userStyles.toggleText}>
				<Text style={userStyles.rowLabel} numberOfLines={1}>
					{label}
				</Text>
				{detail ? (
					<Text style={userStyles.detail} numberOfLines={1}>
						{detail}
					</Text>
				) : null}
				{hint ? <Text style={userStyles.hint}>{hint}</Text> : null}
			</View>
			<AppSwitch
				value={value}
				disabled={disabled}
				onValueChange={onToggle}
			/>
		</View>
		{value && children ? (
			<View style={userStyles.form}>{children}</View>
		) : null}
	</View>
);

// Feuille partagée : la règle ne voit pas les usages, qui sont dans les
// lignes qui l'importent.
/* eslint-disable react-native/no-unused-styles */
export const userStyles = StyleSheet.create({
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.light,
		marginHorizontal: 20,
		borderRadius: 12,
		paddingHorizontal: 16,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	divider: {
		height: StyleSheet.hairlineWidth,
		backgroundColor: INPUT_BORDER
	},
	row: {
		height: ELEMENT_HEIGHT,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	rowLabel: {
		...labelText,
		flexShrink: 0
	},
	rowValue: {
		flex: 1,
		textAlign: 'right',
		color: COLORS.primary,
		fontSize: 15,
		fontWeight: 'bold'
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: ELEMENT_HEIGHT,
		paddingVertical: 10
	},
	toggleText: {
		flex: 1,
		gap: 2
	},
	// Un peu d'air entre le libellé et la valeur (ex. l'email masqué).
	// Valeur sous le libellé (ex. email masqué) : un peu d'air autour.
	detail: {
		marginTop: 10,
		marginBottom: 6,
		color: COLORS.primary,
		fontSize: 15,
		fontWeight: 'bold'
	},
	hint: {
		color: COLORS.primary,
		opacity: 0.6,
		fontSize: 12
	},
	form: {
		gap: 8,
		paddingBottom: 16
	},
	notice: {
		marginBottom: 12
	},
	label: labelText,
	input: {
		...inputText,
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: INPUT_BORDER,
		borderRadius: 12,
		paddingHorizontal: 12
	},
	fieldInvalid: {
		borderColor: COLORS.danger
	},
	fieldError: {
		color: COLORS.danger,
		fontSize: 13
	},
	button: {
		marginTop: 8
	},
	link: {
		fontWeight: 'bold',
		textDecorationLine: 'underline'
	},
	linkDisabled: {
		opacity: 0.5
	}
});
