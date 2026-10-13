import React from 'react';
import {ScrollView, StyleSheet} from 'react-native';

// Conteneur scrollable pour les écrans de réglages à sections : permet de faire
// défiler quand plusieurs accordéons (sections embarquées) sont dépliés.
export function SettingsScrollView({children}: {children: React.ReactNode}) {
	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.content}
			keyboardShouldPersistTaps="handled">
			{children}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scroll: {
		flex: 1
	},
	content: {
		paddingBottom: 24
	}
});
