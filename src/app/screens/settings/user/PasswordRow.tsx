import React from 'react';
import {Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {placeholderColor} from '../../../styles/components/common/Input';
import {hapticOptions} from '../../../data/cycleTypes';
import {authenticationService} from '../../../../module/authentication/domain/services/auth.service';
import {
	BoxConfigurationIssue,
	PASSWORD_MIN_LENGTH,
	passwordIssue
} from '../../../../services/validation/boxConfigurationForm';
import {PasswordInput} from '../../../components/common/PasswordInput';
import {ModalPasswordConfirm} from '../../../components/common/ModalPasswordConfirm';
import {findProfileByLogin} from '../../../components/common/RememberMeManager';
import {ToggleRow, userStyles} from './userSettingsUi';

export type PasswordRowHandle = {submit: () => void};

/**
 * Mot de passe : l'interrupteur déplie le nouveau mot de passe et sa
 * confirmation (le couper annule la saisie). Une fois le mot de passe valide
 * et confirmé, la validation se fait depuis l'en-tête de l'écran (`submit`,
 * affiché tant que `onDirtyChange` le signale), puis le mot de passe actuel
 * est demandé dans une popup. Pas de code (OTP) : le mot de passe actuel
 * suffit à confirmer. Une fois changé, la session est fermée (logout) et
 * l'on atterrit sur l'écran de connexion, le login pré-rempli.
 */
export const PasswordRow = React.forwardRef<
	PasswordRowHandle,
	Readonly<{login: string; onDirtyChange: (dirty: boolean) => void}>
>(function PasswordRow({login, onDirtyChange}, ref) {
	const {t} = useTranslation(['settings', 'access']);
	const [editing, setEditing] = React.useState(false);
	const [password, setPassword] = React.useState('');
	const [confirmPassword, setConfirmPassword] = React.useState('');
	const [confirming, setConfirming] = React.useState(false);

	const passwordError = passwordIssue(password);
	const confirmError: BoxConfigurationIssue | '' = !confirmPassword
		? 'confirmRequired'
		: !passwordError && confirmPassword !== password
		? 'passwordMismatch'
		: '';
	// Messages dès que le champ est rempli : sans bouton dans la ligne, c'est
	// la seule indication de ce qui manque à valider.
	const messageFor = (value: string, issue: BoxConfigurationIssue | '') =>
		value && issue
			? t(`access:validation.${issue}`, {min: PASSWORD_MIN_LENGTH})
			: undefined;
	const passwordMessage = messageFor(password, passwordError);
	const confirmMessage = messageFor(confirmPassword, confirmError);

	// Mot de passe valide et confirmé : valider apparaît dans l'en-tête.
	const dirty = editing && !passwordError && !confirmError;

	React.useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
	// Section repliée (ligne démontée) : le bouton valider de l'en-tête disparaît.
	React.useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

	const close = () => {
		setEditing(false);
		setPassword('');
		setConfirmPassword('');
		setConfirming(false);
	};

	React.useImperativeHandle(ref, () => ({
		submit: () => {
			if (!dirty) return;
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			setConfirming(true);
		}
	}));

	// Renvoie l'erreur à afficher dans la popup, rien en cas de succès.
	const changePassword = async (currentPassword: string) => {
		const res = await authenticationService.changePassword(
			login,
			currentPassword,
			password
		);
		if (res.res) {
			// Mot de passe changé : la session est fermée, l'utilisateur se
			// reconnecte avec le nouveau, directement sur la connexion de ce
			// login, le nouveau mot de passe déjà saisi. Son profil mémorisé
			// suit, pour y enregistrer ce mot de passe.
			const profile = await findProfileByLogin(login);
			await authenticationService.signout({login, profile, password});
			return undefined;
		}
		ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
		return res.error || t('user.password.failed');
	};

	return (
		<>
			<ToggleRow
				label={t('user.password.title')}
				value={editing}
				onToggle={() => {
					if (editing) close();
					else setEditing(true);
				}}>
				<PasswordInput
					style={[
						userStyles.input,
						passwordMessage ? userStyles.fieldInvalid : null
					]}
					placeholder={t('access:boxConfig.newPassword')}
					placeholderTextColor={placeholderColor}
					textContentType={'newPassword'}
					value={password}
					onChangeText={setPassword}
				/>
				{passwordMessage ? (
					<Text style={userStyles.fieldError}>{passwordMessage}</Text>
				) : null}
				<PasswordInput
					style={[
						userStyles.input,
						confirmMessage ? userStyles.fieldInvalid : null
					]}
					placeholder={t('access:boxConfig.confirmPassword')}
					placeholderTextColor={placeholderColor}
					textContentType={'newPassword'}
					value={confirmPassword}
					onChangeText={setConfirmPassword}
				/>
				{confirmMessage ? (
					<Text style={userStyles.fieldError}>{confirmMessage}</Text>
				) : null}
			</ToggleRow>
			<ModalPasswordConfirm
				isOpen={confirming}
				title={t('user.password.title')}
				message={t('user.password.confirmMessage')}
				onClose={() => setConfirming(false)}
				onConfirm={changePassword}
			/>
		</>
	);
});
