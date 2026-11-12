import React from 'react';
import {
	StyleProp,
	StyleSheet,
	Text,
	TextStyle,
	View,
	ViewStyle
} from 'react-native';

export const DESC_COLORS = {
	background: '#F1F5F9',
	text: '#32404e'
};

/**
 * Encadré descriptif, sans icône ni bordure : fond gris pâle pour ce qui se
 * lit sans alerter (description d'une section, récapitulatif libellé /
 * valeur). `message` s'affiche avant les `children`.
 */
export function DescBox({
	message,
	style,
	textStyle,
	children
}: Readonly<{
	message?: string;
	style?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
	children?: React.ReactNode;
}>) {
	return (
		<View style={[styles.wrap, style]}>
			{message ? (
				<Text style={[styles.text, textStyle]}>{message}</Text>
			) : null}
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		alignSelf: 'stretch',
		padding: 12,
		borderRadius: 12,
		backgroundColor: DESC_COLORS.background
	},
	text: {
		color: DESC_COLORS.text,
		fontSize: 14,
		lineHeight: 19
	}
});
