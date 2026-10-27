import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {pendingRequests} from '../../../services/socket';

// Une réponse plus rapide que ce délai n'affiche pas de loader : évite un
// flash à chaque petite requête.
const SHOW_DELAY_MS = 250;

const COLORS = {
	spinner: '#32404e',
	backdrop: 'rgba(255, 255, 255, 0.5)'
};

/**
 * Loader plein écran affiché tant qu'une requête socket attend la réponse du
 * box (voir `pendingRequests`). Monté une seule fois à la racine de l'app, il
 * couvre tous les écrans, y compris leurs rechargements. C'est une simple vue
 * en overlay plutôt qu'une `Modal`, pour cohabiter avec les spinners `Modal`
 * que certains écrans affichent déjà.
 */
export const GlobalLoader = () => {
	const busy = React.useSyncExternalStore(
		pendingRequests.subscribe,
		() => pendingRequests.count > 0
	);
	const [visible, setVisible] = React.useState(false);

	React.useEffect(() => {
		if (!busy) {
			setVisible(false);
			return;
		}
		const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
		return () => clearTimeout(timer);
	}, [busy]);

	if (!visible) return null;

	return (
		<View style={styles.overlay}>
			<ActivityIndicator size="large" color={COLORS.spinner} />
		</View>
	);
};

const styles = StyleSheet.create({
	overlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: COLORS.backdrop,
		zIndex: 1000,
		elevation: 1000
	}
});
