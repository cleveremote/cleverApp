import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCircleExclamation} from '@fortawesome/free-solid-svg-icons';

export const ERROR_COLORS = {
	background: '#fdecec',
	border: '#d64545',
	text: '#d64545'
};

/**
 * Bloc d'erreur : message sur fond rouge pâle, encadré de rouge, précédé
 * d'une icône sauf si `hideIcon`.
 */
export function ErrorBox({
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
					icon={faCircleExclamation}
					size={14}
					color={ERROR_COLORS.text}
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
		borderColor: ERROR_COLORS.border,
		backgroundColor: ERROR_COLORS.background
	},
	icon: {marginTop: 2},
	text: {
		flex: 1,
		color: ERROR_COLORS.text,
		fontSize: 14
	}
});
