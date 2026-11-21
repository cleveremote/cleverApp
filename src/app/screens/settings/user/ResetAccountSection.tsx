import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';
import {placeholderColor} from '../../../styles/components/common/Input';
import {hapticOptions} from '../../../data/cycleTypes';
import {authenticationService} from '../../../../module/authentication/domain/services/auth.service';
import {
	deleteProfile,
	findProfileByLogin
} from '../../../components/common/RememberMeManager';
import {ErrorBox} from '../../../components/common/ErrorBox';
import {ModalPasswordConfirm} from '../../../components/common/ModalPasswordConfirm';
import {InfoBox} from '../../../components/common/InfoBox';
import {
	WARNING_COLORS,
	WarningBox
} from '../../../components/common/WarningBox';
import {COLORS} from '../../access/accessUi';
import {RowDivider, ToggleRow, userStyles} from './userSettingsUi';

type Scope = {data: boolean; account: boolean};

const NO_SCOPE: Scope = {data: false, account: false};

export type ResetAccountSectionHandle = {submit: () => void};

/** Oublie le profil mémorisé (et son mot de passe) de ce login. */
const forgetProfile = async (login: string) => {
	const profile = await findProfileByLogin(login);
	if (profile) await deleteProfile(profile);
};

/**
 * Contenu de la section Réinitialisation : on active ce qu'on efface (données
 * de la box et/ou compte), ce qui déplie un champ où recopier le login ; dès
 * que la saisie correspond, valider apparaît en haut à droite (signalé par
 * `onDirtyChange`) et demande le mot de passe actuel dans une popup, qui
 * confirme l'envoi de `front/box/reset/account`. Si le compte est
 * effacé, la session est fermée et le profil mémorisé de ce login supprimé.
 * Toute modification d'un toggle vide la confirmation.
 */
export const ResetAccountSection = React.forwardRef<
	ResetAccountSectionHandle,
	Readonly<{login: string; onDirtyChange: (dirty: boolean) => void}>
>(function ResetAccountSection({login, onDirtyChange}, ref) {
	const {t} = useTranslation('settings');
	const [scope, setScope] = React.useState<Scope>(NO_SCOPE);
	const [typed, setTyped] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState('');
	const [done, setDone] = React.useState(false);
	const [confirming, setConfirming] = React.useState(false);
	const hasScope = scope.data || scope.account;

	// Au moins un toggle et le login recopié : valider apparaît dans l'en-tête.
	const dirty = hasScope && !busy && typed.trim() === login;

	React.useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
	// Section repliée (contenu démonté) : le bouton valider de l'en-tête disparaît.
	React.useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

	const toggle = (key: keyof Scope) => {
		setScope(s => ({...s, [key]: !s[key]}));
		// Le choix a changé : la confirmation repart de zéro.
		setTyped('');
		setDone(false);
		setError('');
	};

	// Renvoie l'erreur à afficher dans la popup (mot de passe refusé…), rien
	// en cas de succès.
	const reset = async (password: string) => {
		ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
		setBusy(true);
		setError('');
		const res = await authenticationService.resetAccount(
			login,
			password,
			scope
		);
		if (res.res && scope.account) {
			// Compte effacé : son profil mémorisé ne sert plus, on l'oublie
			// avant que l'écran de connexion ne relise la liste des profils.
			await forgetProfile(login);
			await authenticationService.signout();
			return undefined;
		}
		setBusy(false);
		if (res.res) {
			setConfirming(false);
			setTyped('');
			setScope(NO_SCOPE);
			setDone(true);
			return undefined;
		}
		ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
		return res.error || t('user.reset.failed');
	};

	React.useImperativeHandle(ref, () => ({
		submit: () => {
			if (!dirty) return;
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			setConfirming(true);
		}
	}));

	return (
		<View>
			<ToggleRow
				label={t('user.reset.data')}
				hint={t('user.reset.dataHint')}
				value={scope.data}
				disabled={busy}
				onToggle={() => toggle('data')}
			/>
			<RowDivider />
			<ToggleRow
				label={t('user.reset.account')}
				hint={t('user.reset.accountHint')}
				value={scope.account}
				disabled={busy}
				onToggle={() => toggle('account')}
			/>
			<View style={styles.footer}>
				{hasScope ? (
					<View style={styles.confirm}>
						{/* Icône dans le texte (et non en colonne) : le texte
						    revient à la ligne sous l'icône, sur toute la largeur. */}
						<WarningBox hideIcon>
							<Text style={styles.warning}>
								<FontAwesomeIcon
									icon={faTriangleExclamation}
									size={13}
									color={WARNING_COLORS.accent}
								/>{' '}
								{t('user.reset.warning')}
								{scope.account
									? ` ${t('user.reset.logoutNotice')}`
									: ''}{' '}
								{t('user.reset.typeLogin', {login})}
							</Text>
						</WarningBox>
						<TextInput
							style={[userStyles.input, styles.input]}
							placeholder={login}
							placeholderTextColor={placeholderColor}
							autoCapitalize={'none'}
							autoCorrect={false}
							editable={!busy}
							value={typed}
							onChangeText={setTyped}
						/>
					</View>
				) : null}
				{error ? <ErrorBox message={error} /> : null}
				{done ? <InfoBox message={t('user.reset.success')} /> : null}
			</View>
			<ModalPasswordConfirm
				isOpen={confirming}
				title={t('user.reset.title')}
				message={t('user.reset.confirmMessage')}
				onClose={() => setConfirming(false)}
				onConfirm={reset}
			/>
		</View>
	);
});

const styles = StyleSheet.create({
	footer: {
		gap: 8,
		paddingTop: 8,
		paddingBottom: 16
	},
	confirm: {
		gap: 8,
		marginTop: 4
	},
	warning: {
		color: WARNING_COLORS.text,
		fontSize: 13,
		lineHeight: 18
	},
	input: {
		borderColor: COLORS.danger
	}
});
