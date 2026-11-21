import React from 'react';
import {StyleSheet} from 'react-native';
import {KeyboardAwareScrollView} from './KeyboardAwareScrollView';

// Conteneur scrollable pour les écrans de réglages à sections : permet de faire
// défiler quand plusieurs accordéons (sections embarquées) sont dépliés, et
// garder le champ focus (et son erreur) au-dessus du clavier.
export function SettingsScrollView({children}: {children: React.ReactNode}) {
	return (
		<KeyboardAwareScrollView
			style={styles.scroll}
			contentContainerStyle={styles.content}>
			{children}
		</KeyboardAwareScrollView>
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
