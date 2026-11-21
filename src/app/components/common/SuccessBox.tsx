import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCircleCheck} from '@fortawesome/free-solid-svg-icons';

export const SUCCESS_COLORS = {
	background: '#e8f5e9',
	border: '#4caf50',
	text: '#2e7d32'
};

/**
 * Bloc de succès : message sur fond vert pâle, encadré de vert, précédé
 * d'une icône sauf si `hideIcon` (même gabarit qu'ErrorBox / InfoBox).
 */
export function SuccessBox({
	message,
	hideIcon = false,
	style
}: Readonly<{
	message: React.ReactNode;
	hideIcon?: boolean;
	style?: StyleProp<ViewStyle>;
}>) {
	return (
		<View style={[styles.wrap, style]}>
			{!hideIcon && (
				<FontAwesomeIcon
					icon={faCircleCheck}
					size={14}
					color={SUCCESS_COLORS.text}
					style={styles.icon}
				/>
			)}
			<Text style={styles.text}>{message}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: SUCCESS_COLORS.border,
		backgroundColor: SUCCESS_COLORS.background
	},
	icon: {marginTop: 2},
	text: {
		flex: 1,
		color: SUCCESS_COLORS.text,
		fontSize: 14
	}
});
