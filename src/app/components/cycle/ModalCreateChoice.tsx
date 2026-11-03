import React, {useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {faLayerGroup, faSyncAlt, IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {BlurView} from '@react-native-community/blur';
import {Modal, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../data/cycleTypes';

export type CreateChoice = {isGroup?: boolean};

/**
 * Choix du type de cycle à créer (classique / groupe), au style de la modale
 * « Forcer la durée » : sans titre ni Annuler, un appui à l'extérieur ferme.
 */
export function ModalCreateChoice({
	isOpen,
	onClose,
	onChoose
}: Readonly<{
	isOpen: boolean;
	onClose: () => void;
	onChoose: (choice: CreateChoice) => void;
}>) {
	const {t} = useTranslation('cycle');
	// Choix exécuté une fois la modale réellement fermée : naviguer pendant
	// l'animation de fermeture laisse sur iOS une fenêtre modale invisible qui
	// bloque les touchers (cf. ModalOverrideDuration).
	const pending = useRef<CreateChoice | null>(null);

	const flushPending = () => {
		const choice = pending.current;
		pending.current = null;
		if (choice) {
			onChoose(choice);
		}
	};

	const choose = (choice: CreateChoice) => {
		pending.current = choice;
		onClose();
		// onDismiss n'est fiable que sur iOS.
		if (Platform.OS !== 'ios') {
			flushPending();
		}
	};

	const cancel = () => {
		pending.current = null;
		onClose();
	};

	const option = (label: string, icon: IconDefinition, choice: CreateChoice) => (
		<Pressable
			onPress={() => {
				ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
				choose(choice);
			}}
			style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}>
			<FontAwesomeIcon icon={icon} size={16} color={COLORS.primary} />
			<Text style={styles.label}>{label}</Text>
		</Pressable>
	);

	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={cancel}
			onDismiss={flushPending}>
			<View style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={cancel} />
				<View style={styles.card}>
					{/* Carte floutée comme l'alerte native iOS ; pas sur Android
					    (fond noir derrière une Modal). */}
					{Platform.OS === 'ios' && (
						<BlurView
							style={StyleSheet.absoluteFill}
							blurType="light"
							blurAmount={20}
							reducedTransparencyFallbackColor={COLORS.cardFallback}
						/>
					)}
					{option(t('create.classic'), faSyncAlt, {})}
					{option(t('create.group'), faLayerGroup, {isGroup: true})}
				</View>
			</View>
		</Modal>
	);
}

// Carte comme ModalOverrideDuration, boutons comme « Discover » (DevicesScreen).
const COLORS = {
	primary: '#32404e',
	backdrop: 'rgba(0,0,0,0.2)',
	cardBackground:
		Platform.OS === 'ios' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)',
	cardFallback: 'white'
};

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.backdrop
	},
	card: {
		backgroundColor: COLORS.cardBackground,
		borderRadius: 14,
		overflow: 'hidden',
		padding: 20,
		width: '80%',
		gap: 12
	},
	button: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: COLORS.primary
	},
	buttonPressed: {
		opacity: 0.7
	},
	label: {
		color: COLORS.primary,
		fontSize: 15,
		fontWeight: 'bold'
	}
});
