import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { BlurView } from '@react-native-community/blur';
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View
} from 'react-native';
import { placeholderColor } from '../../styles/components/common/Input';
import { OutlineButton } from '../../screens/access/accessUi';
import { userStyles } from '../../screens/settings/user/userSettingsUi';
import { PasswordInput } from './PasswordInput';
import { ErrorBox } from './ErrorBox';

/**
 * Popup demandant le mot de passe actuel au moment de valider une
 * modification sensible (même carte que ModalOverrideDuration). `onConfirm`
 * renvoie un message d'erreur pour rester ouverte (ex. mot de passe refusé),
 * ou rien si l'opération a réussi.
 */
export function ModalPasswordConfirm({
	isOpen,
	title,
	message,
	onClose,
	onConfirm
}: {
	isOpen: boolean;
	title: string;
	message?: string;
	onClose: () => void;
	onConfirm: (password: string) => Promise<string | undefined>;
}) {
	const { t } = useTranslation(['settings', 'access', 'common']);
	const [password, setPassword] = useState('');
	const [touched, setTouched] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	// Champ vierge à chaque ouverture.
	useEffect(() => {
		if (isOpen) {
			setPassword('');
			setTouched(false);
			setError('');
		}
	}, [isOpen]);

	const passwordMessage =
		touched && !password ? t('access:validation.passwordRequired') : undefined;

	const confirm = async () => {
		setTouched(true);
		if (!password) return;
		setBusy(true);
		setError('');
		const failure = await onConfirm(password);
		setBusy(false);
		if (failure) setError(failure);
	};

	const cancel = () => {
		if (!busy) onClose();
	};

	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={cancel}
		>
			<KeyboardAvoidingView
				style={styles.backdrop}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			>
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
					{message ? <Text style={styles.message}>{message}</Text> : null}
					<PasswordInput
						style={[
							userStyles.input,
							styles.input,
							passwordMessage ? userStyles.fieldInvalid : null
						]}
						placeholder={t('user.currentPassword')}
						placeholderTextColor={placeholderColor}
						textContentType={'password'}
						autoFocus
						value={password}
						onChangeText={setPassword}
						onSubmitEditing={confirm}
					/>
					{passwordMessage ? (
						<Text style={userStyles.fieldError}>{passwordMessage}</Text>
					) : null}
					{error ? <ErrorBox message={error} /> : null}
					<OutlineButton
						label={t('access:forgotPassword.validate')}
						icon={faCheck}
						busy={busy}
						onPress={confirm}
						style={userStyles.button}
					/>
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
	inputBackground: 'white'
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
		gap: 8,
		elevation: 8
	},
	title: {
		fontSize: 17,
		fontWeight: 'bold',
		textAlign: 'center',
		color: COLORS.primary
	},
	message: {
		marginBottom: 4,
		textAlign: 'center',
		color: COLORS.primary
	},
	input: {
		backgroundColor: COLORS.inputBackground
	}
});
