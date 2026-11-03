import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { BlurView } from '@react-native-community/blur';
import {
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { DurationColumn } from './modalOverrideDuration';

/**
 * Popup de saisie d'un intervalle « du … au … » par deux roues, sur le modèle
 * de ModalOverrideDuration. Les valeurs proposées sont fournies par `options`
 * (ex. les mois, les jours du mois) ; `from` / `to` sont les valeurs initiales,
 * reprises à chaque ouverture. La validation est refusée si début > fin.
 */
export function ModalRangePicker({
	isOpen,
	title,
	message,
	fromLabel,
	toLabel,
	options,
	from,
	to,
	onClose,
	onConfirm
}: {
	isOpen: boolean;
	title: string;
	message?: string;
	fromLabel: string;
	toLabel: string;
	options: { label: string; value: number }[];
	from: number;
	to: number;
	onClose: () => void;
	onConfirm: (from: number, to: number) => void;
}) {
	const { t } = useTranslation();
	const [start, setStart] = useState(from);
	const [end, setEnd] = useState(to);
	// Intervalle validé, transmis seulement une fois la modale réellement
	// fermée (cf. ModalOverrideDuration : re-render pendant l'animation de
	// fermeture = fenêtre modale invisible qui bloque les touchers sur iOS).
	const pending = useRef<[number, number] | null>(null);
	const [startSpinning, setStartSpinning] = useState(false);
	const [endSpinning, setEndSpinning] = useState(false);
	const canConfirm = start <= end && !startSpinning && !endSpinning;

	// Repart des valeurs courantes à chaque ouverture.
	useEffect(() => {
		if (isOpen) {
			setStart(from);
			setEnd(to);
			setStartSpinning(false);
			setEndSpinning(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const items = useMemo(
		() =>
			options.map(o => (
				<Picker.Item key={o.value} label={o.label} value={o.value} />
			)),
		[options]
	);

	const flushPending = () => {
		const value = pending.current;
		pending.current = null;
		if (value !== null) {
			onConfirm(value[0], value[1]);
		}
	};

	const confirm = () => {
		pending.current = [start, end];
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

	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={cancel}
			onDismiss={flushPending}
		>
			<View style={styles.backdrop}>
				{/* Toucher en dehors de la carte ferme la popup (frère de la
				    carte pour ne pas capter les gestes des roues). */}
				<Pressable style={StyleSheet.absoluteFill} onPress={cancel} />
				<View style={styles.card}>
					{Platform.OS === 'ios' && (
						<BlurView
							style={StyleSheet.absoluteFill}
							blurType="light"
							blurAmount={20}
							reducedTransparencyFallbackColor={COLORS.cardFallback}
						/>
					)}
					<Text style={styles.title}>{title}</Text>
					{!!message && <Text style={styles.message}>{message}</Text>}
					<View style={styles.columns}>
						<DurationColumn
							label={fromLabel}
							value={start}
							onChange={setStart}
							onSpinningChange={setStartSpinning}
							items={items}
						/>
						<DurationColumn
							label={toLabel}
							value={end}
							onChange={setEnd}
							onSpinningChange={setEndSpinning}
							items={items}
						/>
					</View>
					<View style={styles.actions}>
						<Pressable
							onPress={confirm}
							disabled={!canConfirm}
							style={({ pressed }) => [
								styles.confirmButton,
								pressed && styles.confirmButtonPressed,
								!canConfirm && styles.confirmButtonDisabled
							]}
						>
							<FontAwesomeIcon
								icon={faCheck}
								size={16}
								color={COLORS.onPrimary}
							/>
							<Text style={styles.confirmLabel}>
								{t('confirmChoice')}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

// Mêmes couleurs que ModalOverrideDuration.
const COLORS = {
	primary: '#32404e',
	backdrop: 'rgba(0,0,0,0.2)',
	cardBackground:
		Platform.OS === 'ios' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.95)',
	cardFallback: 'white',
	onPrimary: 'white'
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
		width: '80%'
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
	},
	columns: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'center'
	},
	confirmButton: {
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 12,
		backgroundColor: COLORS.primary,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8
	},
	confirmButtonPressed: {
		opacity: 0.85
	},
	confirmButtonDisabled: {
		opacity: 0.7
	},
	confirmLabel: {
		color: COLORS.onPrimary,
		fontSize: 15,
		fontWeight: 'bold'
	}
});
