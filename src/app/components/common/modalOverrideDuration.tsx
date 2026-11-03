import React, { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
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
import { WheelPicker } from './WheelPicker';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
// Items construits une seule fois : les recréer à chaque changement de valeur
// fait re-réconcilier les 84 lignes des roues et retarde le rendu du bouton.
const toItems = (count: number) =>
	Array.from({ length: count }, (_, n) => (
		<Picker.Item key={n} label={pad(n)} value={n} />
	));
const HOUR_ITEMS = toItems(24);
const MINUTE_ITEMS = toItems(60);
// Même hauteur pour la roue iOS et ses items : sinon la roue (216 par défaut)
// est rognée et la ligne sélectionnée n'est plus centrée verticalement.
const PICKER_HEIGHT = 160;

// La roue iOS n'émet onChange qu'une fois arrêtée, sans événement de début de
// défilement : on la considère « en rotation » dès qu'on la touche, jusqu'à
// onValueChange. Si elle s'arrête sur la même valeur, rien n'est émis, d'où ce
// délai de secours après le relâchement (couvre l'inertie d'un lancer).
const SPIN_SETTLE_FALLBACK = 2000;

// Mémoïsé : changer les heures ne re-rend pas la roue des minutes (et inversement).
// Exporté pour les autres popups à roues (ex. ModalRangePicker).
export const DurationColumn = memo(function DurationColumn({
	label,
	value,
	onChange,
	onSpinningChange,
	items
}: {
	label: string;
	value: number;
	onChange: (value: number) => void;
	onSpinningChange: (spinning: boolean) => void;
	items: React.ReactElement<{ label: string; value: number }>[];
}) {
	const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearSettleTimer = () => {
		if (settleTimer.current !== null) {
			clearTimeout(settleTimer.current);
			settleTimer.current = null;
		}
	};

	useEffect(() => clearSettleTimer, []);

	const onTouchStart = () => {
		clearSettleTimer();
		onSpinningChange(true);
	};

	const onTouchEnd = () => {
		clearSettleTimer();
		settleTimer.current = setTimeout(
			() => onSpinningChange(false),
			SPIN_SETTLE_FALLBACK
		);
	};

	// Sur Android le Picker natif est une liste déroulante (dialog plein
	// écran) : on le remplace par une roue JS au rendu proche de celle d'iOS,
	// qui signale elle-même son défilement. Les options sont relues des items.
	if (Platform.OS !== 'ios') {
		return (
			<View style={styles.column}>
				<Text style={styles.columnLabel}>{label}</Text>
				<WheelPicker
					options={items.map(item => item.props)}
					value={value}
					onChange={onChange}
					onSpinningChange={onSpinningChange}
					color={COLORS.primary}
				/>
			</View>
		);
	}

	return (
		<View
			style={styles.column}
			onTouchStart={onTouchStart}
			onTouchEnd={onTouchEnd}
			onTouchCancel={onTouchEnd}
		>
			<Text style={styles.columnLabel}>{label}</Text>
			<Picker
				selectedValue={value}
				onValueChange={v => {
					clearSettleTimer();
					onChange(Number(v));
					onSpinningChange(false);
				}}
				style={styles.picker}
				itemStyle={styles.pickerItem}
			>
				{items}
			</Picker>
		</View>
	);
});

export function ModalOverrideDuration({
	isOpen,
	onClose,
	onConfirm
}: {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (ms: number) => void;
}) {
	const { t } = useTranslation();
	// Durée saisie en heures + minutes, envoyée en ms.
	const [hours, setHours] = useState(0);
	const [minutes, setMinutes] = useState(0);
	// Durée validée, exécutée seulement une fois la modale réellement fermée :
	// dispatcher pendant l'animation de fermeture (re-render du statut) laisse
	// sur iOS une fenêtre modale invisible qui bloque tous les touchers.
	const pendingMs = useRef<number | null>(null);
	// Roues en cours de rotation : leur valeur n'est pas encore remontée.
	const [hoursSpinning, setHoursSpinning] = useState(false);
	const [minutesSpinning, setMinutesSpinning] = useState(false);
	const ms = hours * HOUR + minutes * MINUTE;
	const canExecute = ms > 0 && !hoursSpinning && !minutesSpinning;

	const reset = () => {
		setHours(0);
		setMinutes(0);
		setHoursSpinning(false);
		setMinutesSpinning(false);
	};

	const flushPending = () => {
		const value = pendingMs.current;
		pendingMs.current = null;
		reset();
		if (value !== null) {
			onConfirm(value);
		}
	};

	const confirm = () => {
		pendingMs.current = ms;
		onClose();
		// onDismiss n'est fiable que sur iOS ; le Dialog Android n'a pas le
		// problème, on exécute directement.
		if (Platform.OS !== 'ios') {
			flushPending();
		}
	};

	const cancel = () => {
		pendingMs.current = null;
		reset();
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
				{/* Toucher en dehors de la carte ferme la popup. Pressable frère
				    (et non parent) de la carte pour ne pas capter les gestes des
				    roues. */}
				<Pressable style={StyleSheet.absoluteFill} onPress={cancel} />
				<View style={styles.card}>
					{/* Carte floutée comme l'alerte native iOS. Pas sur Android :
					    le BlurView n'y capture pas le contenu derrière une Modal
					    (fenêtre séparée) et rend un fond noir. */}
					{Platform.OS === 'ios' && (
						<BlurView
							style={StyleSheet.absoluteFill}
							blurType="light"
							blurAmount={20}
							reducedTransparencyFallbackColor={COLORS.cardFallback}
						/>
					)}
					<Text style={styles.title}>
						{t('overrideDuration.title')}
					</Text>
					<Text style={styles.message}>
						{t('overrideDuration.message')}
					</Text>
					<View style={styles.columns}>
						<DurationColumn
							label={t('overrideDuration.hours')}
							value={hours}
							onChange={setHours}
							onSpinningChange={setHoursSpinning}
							items={HOUR_ITEMS}
						/>
						<DurationColumn
							label={t('overrideDuration.minutes')}
							value={minutes}
							onChange={setMinutes}
							onSpinningChange={setMinutesSpinning}
							items={MINUTE_ITEMS}
						/>
					</View>
					<View style={styles.actions}>
						{/* Pressable plutôt que TouchableOpacity : ce dernier anime
						    l'opacité sur 250 ms à chaque changement de `disabled`. */}
						<Pressable
							onPress={confirm}
							disabled={!canExecute}
							style={({ pressed }) => [
								styles.executeButton,
								pressed && styles.executeButtonPressed,
								!canExecute && styles.executeButtonDisabled
							]}
						>
							<FontAwesomeIcon
								icon={faPlay}
								size={16}
								color={COLORS.onPrimary}
							/>
							<Text style={styles.executeLabel}>
								{t('execute')}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

// Mêmes couleurs que le bouton « Discover » de la liste des master devices.
// Fond légèrement assombri et carte floutée semi-transparente, comme l'alerte
// native (même style que ModalCreateChoice).
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
		// Rogne le BlurView aux coins arrondis.
		overflow: 'hidden',
		padding: 20,
		width: '80%',
		// Pas de flou sur Android : une ombre détache la carte du fond.
		elevation: 8
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
	column: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	columnLabel: {
		fontWeight: 'bold',
		marginBottom: Platform.OS === 'ios' ? 0 : 8,
		color: COLORS.primary,
		textAlign: 'center'
	},
	picker: {
		width: '100%',
		height: PICKER_HEIGHT,
		justifyContent: 'center'
	},
	pickerItem: {
		height: PICKER_HEIGHT,
		fontSize: 20,
		color: COLORS.primary,
		textAlign: 'center'
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'center'
	},
	executeButton: {
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 12,
		backgroundColor: COLORS.primary,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8
	},
	executeButtonPressed: {
		opacity: 0.85
	},
	executeButtonDisabled: {
		opacity: 0.7
	},
	executeLabel: {
		color: COLORS.onPrimary,
		fontSize: 15,
		fontWeight: 'bold'
	}
});
