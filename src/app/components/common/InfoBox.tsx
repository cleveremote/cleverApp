import React from 'react';
import {
	StyleProp,
	StyleSheet,
	Text,
	TextStyle,
	View,
	ViewStyle
} from 'react-native';

export const INFO_COLORS = {
	background: '#eaf4ff',
	border: '#7cb8f5',
	text: '#0a5bb5'
};

/**
 * Bloc d'information : message sur fond bleu pâle, encadré de bleu.
 * `textStyle` remplace le style du message (ex. celui des libellés).
 */
export function InfoBox({
	message,
	style,
	textStyle
}: Readonly<{
	message: string;
	style?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
}>) {
	return (
		<View style={[styles.wrap, style]}>
			<Text style={[styles.text, textStyle]}>{message}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: INFO_COLORS.border,
		backgroundColor: INFO_COLORS.background
	},
	text: {
		color: INFO_COLORS.text,
		fontSize: 14
	}
});
