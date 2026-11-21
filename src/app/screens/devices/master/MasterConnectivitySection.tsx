import React from 'react';
import i18n from 'i18next';
import {StyleSheet, View} from 'react-native';
import {Row} from '../slave/commandUi';

// Connectivity du master : adresse IP et port (`config.ipAddress` /
// `config.port`), en lecture seule, sur une même ligne icône / libellé / valeur
// comme les lignes de la section Modèle d'un slave. Libellés à la largeur de
// leur texte : même écart libellé / valeur pour l'IP et le port.
export function MasterConnectivitySection({device}: Readonly<{device: any}>) {
	const port = device?.config?.port;
	return (
		<View style={styles.card}>
			<Row
				labelWidth="auto"
				icon="network-wired"
				label={i18n.t('devices:ipAddress')}
				value={device?.config?.ipAddress}
				aside={{
					icon: 'ethernet',
					label: i18n.t('devices:port'),
					value: port != null ? `${port}` : undefined
				}}
			/>
		</View>
	);
}

const COLORS = {
	cardBackground: 'white'
};

// Même gabarit que le contenu de la section Modèle (SlaveModelSection).
const styles = StyleSheet.create({
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 16
	}
});
