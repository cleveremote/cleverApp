import React from 'react';
import { BlurView } from '@react-native-community/blur';
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleProp,
	StyleSheet,
	Text,
	View,
	ViewStyle
} from 'react-native';

/**
 * Popup de référence de l'app : fond légèrement assombri, carte floutée
 * semi-transparente comme l'alerte native iOS, ombre portée pour l'effet de
 * profondeur. Toucher en dehors de la carte (ou le retour Android) appelle
 * `onClose`. `title` / `message` s'affichent centrés en tête de carte ;
 * `style` règle la taille de la carte (80 % de large par défaut).
 */
export function ModalCard({
	isOpen,
	onClose,
	onDismiss,
	title,
	message,
	style,
	children
}: Readonly<{
	isOpen: boolean;
	onClose: () => void;
	onDismiss?: () => void;
	title?: string;
	message?: string;
	style?: StyleProp<ViewStyle>;
	children?: React.ReactNode;
}>) {
	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={onClose}
			onDismiss={onDismiss}
		>
			<KeyboardAvoidingView
				style={styles.backdrop}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
				{/* Pressable frère (et non parent) de la carte pour ne pas capter
				    les gestes de son contenu (roues, défilement). */}
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
				{/* L'ombre est portée par un parent : `overflow: 'hidden'` de la
				    carte (pour arrondir le flou) la rognerait sur iOS. */}
				<View style={[styles.cardShadow, style]}>
					<View style={styles.card}>
						{/* Pas de flou sur Android : le BlurView n'y capture pas le
						    contenu derrière une Modal (fenêtre séparée) et rend un
						    fond noir. */}
						{Platform.OS === 'ios' && (
							<BlurView
								style={StyleSheet.absoluteFill}
								blurType="light"
								blurAmount={20}
								reducedTransparencyFallbackColor={COLORS.cardFallback}
							/>
						)}
						{title ? <Text style={styles.title}>{title}</Text> : null}
						{message ? <Text style={styles.message}>{message}</Text> : null}
						{children}
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const COLORS = {
	primary: '#32404e',
	backdrop: 'rgba(0,0,0,0.2)',
	cardBackground:
		Platform.OS === 'ios' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)',
	cardFallback: 'white',
	shadow: '#000'
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.backdrop
	},
	// Ombre portée large et décalée vers le bas : effet de profondeur.
	cardShadow: {
		width: '80%',
		borderRadius: 14,
		shadowColor: COLORS.shadow,
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.3,
		shadowRadius: 20
	},
	card: {
		// Se contracte dans un `maxHeight` donné via `style`.
		flexShrink: 1,
		backgroundColor: COLORS.cardBackground,
		borderRadius: 14,
		// Rogne le BlurView aux coins arrondis.
		overflow: 'hidden',
		padding: 20,
		// Pas de flou sur Android : l'élévation porte l'ombre (elle doit être
		// sur la vue qui a un fond).
		elevation: 16
	},
	title: {
		fontSize: 17,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center',
		color: COLORS.primary
	},
	message: {
		marginBottom: 8,
		textAlign: 'center',
		color: COLORS.primary
	}
});
