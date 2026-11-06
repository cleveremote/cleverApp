import React from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	View
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useDispatch, useSelector} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faEnvelopeCircleCheck} from '@fortawesome/free-solid-svg-icons';
import {placeholderColor} from '../../../styles/components/common/Input';
import {hapticOptions} from '../../../data/cycleTypes';
import {
	authenticationService,
	BoxLoginResult
} from '../../../../module/authentication/domain/services/auth.service';
import {emailIssue} from '../../../../services/validation/boxConfigurationForm';
import {selectRecoveryEmail} from '../../../../module/process/infrasctructure/store/models/boxSettings';
import {updateSettings} from '../../../../module/process/infrasctructure/store/actions/settings';
import {ACCOUNT_LOAD} from '../../../../module/process/infrasctructure/store/actions/types';
import {
	CODE_LENGTH,
	CodeInput,
	CountdownCircle,
	isCodeExpired,
	isCodeLocked
} from '../../../components/common/CodeInput';
import {ErrorBox} from '../../../components/common/ErrorBox';
import {InfoBox} from '../../../components/common/InfoBox';
import {
	WarningBox,
	WARNING_COLORS
} from '../../../components/common/WarningBox';
import {ModalPasswordConfirm} from '../../../components/common/ModalPasswordConfirm';
import {COLORS, OutlineButton} from '../../access/accessUi';
import {ToggleRow, userStyles} from './userSettingsUi';

export type RecoveryEmailRowHandle = {submit: () => void};

/** Validité du code envoyé au nouvel email. */
const EMAIL_CODE_TTL_SECONDS = 5 * 60;

/**
 * Email partiellement masqué : 2 premiers caractères, un `•` par caractère
 * restant de la partie locale, puis le domaine en entier (ex.
 * `jo••••@gmail.com` pour `john.d@gmail.com`) : la longueur reste celle de
 * l'email.
 */
export const maskEmail = (email: string) => {
	const at = email.indexOf('@');
	if (at < 0) return email;
	const visible = Math.min(2, at);
	return `${email.slice(0, visible)}${'•'.repeat(at - visible)}${email.slice(
		at
	)}`;
};

/**
 * - `email` : saisie de l'adresse, « Vérifier l'adresse » envoie un code ;
 * - `code` : saisie du code reçu (5 min), renvoyable ;
 * - `verified` : code accepté, le formulaire est prêt à être validé.
 */
type Step = 'email' | 'code' | 'verified';

/**
 * Email de récupération (celui qui reçoit les codes), lu dans la configuration
 * de la box et affiché masqué. L'interrupteur demande le nouvel email,
 * dont on vérifie la possession par un code envoyé à cette adresse. Une fois
 * le code accepté, la validation se fait depuis l'en-tête de l'écran
 * (`submit`, affiché tant que `onDirtyChange` le signale), puis le mot de
 * passe actuel est demandé dans une popup.
 */
export const RecoveryEmailRow = React.forwardRef<
	RecoveryEmailRowHandle,
	Readonly<{login: string; onDirtyChange: (dirty: boolean) => void}>
>(function RecoveryEmailRow({login, onDirtyChange}, ref) {
	const {t} = useTranslation(['settings', 'access']);
	const [editing, setEditing] = React.useState(false);
	const [step, setStep] = React.useState<Step>('email');
	const [email, setEmail] = React.useState('');
	const [touched, setTouched] = React.useState(false);
	const [code, setCode] = React.useState('');
	const [busy, setBusy] = React.useState(false);
	const [error, setError] = React.useState('');
	// Tentatives épuisées sur le code en cours : saisie bloquée jusqu'au renvoi.
	const [locked, setLocked] = React.useState(false);
	const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
	const [remaining, setRemaining] = React.useState(EMAIL_CODE_TTL_SECONDS);
	const [confirming, setConfirming] = React.useState(false);
	const [done, setDone] = React.useState(false);
	const dispatch = useDispatch<any>();
	const settings = useSelector((state: any) => state.root_settings?.settings);
	const account = useSelector((state: any) => state.root_settings?.account);
	const currentEmail = useSelector(selectRecoveryEmail);

	const emailError = emailIssue(email);
	const emailMessage =
		touched && emailError
			? t(`access:validation.${emailError}`)
			: undefined;
	const expired = step === 'code' && remaining <= 0;
	const codeUnusable = expired || locked;
	// Prêt à être validé seulement une fois l'adresse vérifiée.
	const dirty = editing && step === 'verified';

	React.useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
	// Section repliée (ligne démontée) : le bouton valider de l'en-tête disparaît.
	React.useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

	React.useEffect(() => {
		if (expiresAt === null) return;
		const tick = () => {
			const left = Math.max(
				0,
				Math.ceil((expiresAt - Date.now()) / 1000)
			);
			setRemaining(left);
			if (left <= 0) clearInterval(timer);
		};
		const timer = setInterval(tick, 1000);
		tick();
		return () => clearInterval(timer);
	}, [expiresAt]);

	/** Retour à la saisie de l'adresse (code et vérification oubliés). */
	const backToEmail = () => {
		setStep('email');
		setCode('');
		setLocked(false);
		setExpiresAt(null);
		setError('');
	};

	const close = () => {
		backToEmail();
		setEditing(false);
		setEmail('');
		setTouched(false);
		setConfirming(false);
	};

	const requestCode = async () => {
		setBusy(true);
		setError('');
		const res = await authenticationService.requestRecoveryEmailCode(
			login,
			email.trim()
		);
		setBusy(false);
		if (res.res) {
			setStep('code');
			setLocked(false);
			setCode('');
			setRemaining(EMAIL_CODE_TTL_SECONDS);
			setExpiresAt(Date.now() + EMAIL_CODE_TTL_SECONDS * 1000);
		} else {
			ReactNativeHapticFeedback.trigger(
				'notificationError',
				hapticOptions
			);
			setError(res.error || t('user.email.sendFailed'));
		}
	};

	const verifyEmail = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setTouched(true);
		if (emailError) return;
		requestCode();
	};

	const handleCodeFailure = (res: BoxLoginResult) => {
		ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
		setCode('');
		setError(res.error || t('access:forgotPassword.invalidCode'));
		if (isCodeExpired(res)) {
			setExpiresAt(Date.now());
			setRemaining(0);
		} else if (isCodeLocked(res)) {
			setLocked(true);
		}
	};

	const submitCode = async (value: string) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setBusy(true);
		setError('');
		const res = await authenticationService.verifyRecoveryEmailCode(
			login,
			email.trim(),
			value.trim()
		);
		setBusy(false);
		if (res.res) {
			setStep('verified');
			setExpiresAt(null);
		} else {
			handleCodeFailure(res);
		}
	};

	React.useImperativeHandle(ref, () => ({
		submit: () => {
			if (step !== 'verified') return;
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			setConfirming(true);
		}
	}));

	// Renvoie l'erreur à afficher dans la popup, rien en cas de succès.
	const changeEmail = async (password: string) => {
		const res = await authenticationService.changeRecoveryEmail(
			login,
			password,
			email.trim(),
			code.trim()
		);
		if (res.res) {
			// Reflété tout de suite, sans attendre la prochaine configuration.
			dispatch(
				updateSettings({...settings, recoveryEmail: email.trim()})
			);
			dispatch({
				type: ACCOUNT_LOAD,
				payload: {...account, email: email.trim()}
			});
			close();
			setDone(true);
			return undefined;
		}
		ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
		return res.error || t('user.email.failed');
	};

	// Lien « Renvoyer le code », intégré au texte des messages d'alerte.
	const resendLink = (
		<Text
			style={[userStyles.link, busy && userStyles.linkDisabled]}
			disabled={busy}
			onPress={requestCode}>
			{t('access:forgotPassword.resend')}
		</Text>
	);

	return (
		<>
			<ToggleRow
				label={t('user.email.title')}
				detail={currentEmail ? maskEmail(currentEmail) : undefined}
				value={editing}
				onToggle={() => {
					setDone(false);
					if (editing) close();
					else setEditing(true);
				}}>
				<TextInput
					style={[
						userStyles.input,
						emailMessage ? userStyles.fieldInvalid : null
					]}
					placeholder={t('user.email.newEmail')}
					placeholderTextColor={placeholderColor}
					keyboardType={'email-address'}
					textContentType={'emailAddress'}
					autoComplete={'email'}
					autoCapitalize={'none'}
					autoCorrect={false}
					editable={!busy}
					value={email}
					onChangeText={value => {
						setEmail(value);
						// Adresse modifiée : le code envoyé ne la prouve plus.
						if (step !== 'email') backToEmail();
					}}
				/>
				{emailMessage ? (
					<Text style={userStyles.fieldError}>{emailMessage}</Text>
				) : null}
				{step === 'email' ? (
					<>
						{error ? <ErrorBox message={error} /> : null}
						<OutlineButton
							label={t('user.email.verify')}
							icon={faEnvelopeCircleCheck}
							busy={busy}
							disabled={!email.trim()}
							onPress={verifyEmail}
							style={userStyles.button}
						/>
					</>
				) : null}
				{step === 'code' ? (
					<>
						{!codeUnusable ? (
							<InfoBox
								message={t('user.email.codeSent', {
									email: email.trim()
								})}
								style={styles.warning}
							/>
						) : null}
						{expired ? (
							<WarningBox hideIcon={true} style={styles.warning}>
								<Text style={styles.warningText}>
									{t('user.email.codeExpired')} {resendLink}
								</Text>
							</WarningBox>
						) : null}
						{locked && !expired ? (
							<WarningBox hideIcon={true} style={styles.warning}>
								<Text style={styles.warningText}>
									{t('access:forgotPassword.codeLocked')}{' '}
									{resendLink}
								</Text>
							</WarningBox>
						) : null}
						{error ? (
							<ErrorBox message={error} style={styles.errorBox} />
						) : null}
						{!codeUnusable ? (
							<>
								<View style={styles.codeLine}>
									<CodeInput
										value={code}
										onChangeText={value => {
											setCode(value);
											if (error) setError('');
											// Code complet : vérification sans attendre de bouton.
											if (
												value.length === CODE_LENGTH &&
												value !== code &&
												!busy
											)
												submitCode(value);
										}}
										onSubmit={() => {
											if (
												code.trim().length ===
													CODE_LENGTH &&
												!busy
											)
												submitCode(code);
										}}
									/>
									<CountdownCircle
										remaining={remaining}
										total={EMAIL_CODE_TTL_SECONDS}
									/>
								</View>
								{busy ? (
									<ActivityIndicator
										style={styles.codeBusy}
										size="small"
										color={COLORS.primary}
									/>
								) : null}
							</>
						) : null}
					</>
				) : null}
				{step === 'verified' ? (
					<InfoBox message={t('user.email.verified')} />
				) : null}
			</ToggleRow>
			{done ? (
				<InfoBox
					message={t('user.email.success')}
					style={userStyles.notice}
				/>
			) : null}
			<ModalPasswordConfirm
				isOpen={confirming}
				title={t('user.email.title')}
				message={t('user.email.confirmMessage')}
				onClose={() => setConfirming(false)}
				onConfirm={changeEmail}
			/>
		</>
	);
});

const styles = StyleSheet.create({
	codeLine: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	// Mêmes marges que l'étape code de la récupération du compte.
	warning: {
		marginVertical: 8
	},
	warningText: {
		color: WARNING_COLORS.text,
		fontSize: 14
	},
	errorBox: {
		marginBottom: 8
	},
	codeBusy: {
		marginTop: 12
	}
});
