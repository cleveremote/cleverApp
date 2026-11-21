import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';

export const WARNING_COLORS = {
	background: '#fff7ed',
	border: '#fdba74',
	accent: '#ea580c',
	text: '#9a3412'
};

/**
 * Bloc « attention » : contenu libre sur fond orangé, précédé d'une icône
 * triangle sauf si `hideIcon`.
 */
export function WarningBox({
	children,
	hideIcon = false,
	style
}: Readonly<{
	children: React.ReactNode;
	hideIcon?: boolean;
	style?: StyleProp<ViewStyle>;
}>) {
	return (
		<View style={[styles.wrap, style]}>
			{!hideIcon && (
				<FontAwesomeIcon
					icon={faTriangleExclamation}
					size={14}
					color={WARNING_COLORS.accent}
					style={styles.icon}
				/>
			)}
			<View style={styles.body}>{children}</View>
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
		borderColor: WARNING_COLORS.border,
		backgroundColor: WARNING_COLORS.background
	},
	icon: {marginTop: 2},
	body: {flex: 1}
});
