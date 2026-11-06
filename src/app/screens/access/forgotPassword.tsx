import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React from 'react';
import {
	ActivityIndicator,
	Keyboard,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTranslation } from 'react-i18next';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {InputStyle, placeholderColor, inputText} from '../../styles/components/common/Input';
import { hapticOptions } from '../../data/cycleTypes';
import { navigationHeader } from '../../components/common/navigationHeaders';
import {
	authenticationService,
	BoxLoginResult
} from '../../../module/authentication/domain/services/auth.service';
import {
	BoxConfigurationIssue,
	PASSWORD_MIN_LENGTH,
	passwordIssue
} from '../../../services/validation/boxConfigurationForm';
import { COLORS, OutlineButton, useLockedUntil } from './accessUi';
import Logo from '../../../../hydrophyto.svg';
import {
	WarningBox,
	WARNING_COLORS
} from '../../components/common/WarningBox';
import { ErrorBox } from '../../components/common/ErrorBox';
import { InfoBox } from '../../components/common/InfoBox';
import { PasswordInput } from '../../components/common/PasswordInput';
import {
	CODE_LENGTH,
	CODE_TTL_SECONDS,
	CodeInput,
	CountdownCircle,
	isCodeExpired,
	isCodeFailure,
	isCodeLocked
} from '../../components/common/CodeInput';

type Step = 'code' | 'password';

/**
 * Mot de passe oublié : l'identifiant de la box vient de l'écran de connexion,
 * la box envoie un code à l'email de récupération, puis, le code validé,
 * accepte un nouveau mot de passe. Tout passe par `front/box/login` avec
 * `isRecovery` (voir `AuthenticationService.sendRecovery`).
 */
export function ForgotPassword(props: any) {
	const { t } = useTranslation(['access', 'common']);
	const login: string = props.route.params?.login ?? '';
	const [step, setStep] = React.useState<Step>('code');
	const [code, setCode] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [confirmPassword, setConfirmPassword] = React.useState('');
	const [touched, setTouched] = React.useState({
		password: false,
		confirmPassword: false
	});
	const [busy, setBusy] = React.useState(false);
	const [codeSent, setCodeSent] = React.useState(false);
	const [error, setError] = React.useState('');
	// Tentatives épuisées sur le code en cours : saisie bloquée jusqu'au renvoi.
	const [locked, setLocked] = React.useState(false);
	// Échéance du code en cours, en ms : le décompte se recalcule à partir
	// d'elle, il reste donc juste même si l'app est passée en arrière-plan.
	const [expiresAt, setExpiresAt] = React.useState<number | null>(null);
	const [remaining, setRemaining] = React.useState(CODE_TTL_SECONDS);
	const expired = codeSent && remaining <= 0;
	const codeUnusable = expired || locked;
	// Compte bloqué par la box (`ACCOUNT_LOCKED`) : rien n'est envoyé avant
	// l'échéance, ni code ni renvoi.
	const [accountLockedUntil, setAccountLockedUntil] = React.useState<
		number | null
	>(() => authenticationService.getAccountLock(login)?.until ?? null);
	const accountLocked = useLockedUntil(accountLockedUntil);
	React.useEffect(() => {
		// Fin du blocage : le message de la box n'a plus lieu d'être.
		if (accountLockedUntil !== null && !accountLocked) setError('');
	}, [accountLocked, accountLockedUntil]);

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

	const requestCode = async () => {
		const lock = authenticationService.getAccountLock(login);
		if (lock) {
			setAccountLockedUntil(lock.until);
			setError(lock.message || t('forgotPassword.sendFailed'));
			return;
		}
		setBusy(true);
		setError('');
		const res = await authenticationService.requestRecoveryCode(login);
		setBusy(false);
		if (res.res) {
			setCodeSent(true);
			setLocked(false);
			// Nouveau code : l'ancien n'est plus valable.
			setCode('');
			setRemaining(CODE_TTL_SECONDS);
			setExpiresAt(Date.now() + CODE_TTL_SECONDS * 1000);
		} else {
			if (res.lockedUntil) setAccountLockedUntil(res.lockedUntil);
			setError(res.error || t('forgotPassword.sendFailed'));
		}
	};

	React.useEffect(() => {
		props.navigation.setOptions({
			headerTitleAlign: 'center',
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		requestCode();
		return () => authenticationService.endRecovery();
	}, []);

	/**
	 * Code refusé par la box : on vide la saisie, on affiche son message (qui
	 * indique les tentatives restantes) et on bloque la saisie si le code est
	 * expiré ou si les tentatives sont épuisées.
	 */
	const handleCodeFailure = (res: BoxLoginResult) => {
		ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
		setCode('');
		setError(res.error || t('forgotPassword.invalidCode'));
		if (res.lockedUntil) setAccountLockedUntil(res.lockedUntil);
		if (isCodeExpired(res)) {
			setExpiresAt(Date.now());
			setRemaining(0);
		} else if (isCodeLocked(res)) {
			setLocked(true);
		}
	};

	const validateCode = async (value: string) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setBusy(true);
		setError('');
		const res = await authenticationService.verifyRecoveryCode(
			login,
			value.trim()
		);
		setBusy(false);
		if (res.res) {
			setStep('password');
		} else {
			handleCodeFailure(res);
		}
	};

	const codeComplete = code.trim().length === CODE_LENGTH;
	// Lien « Renvoyer le code », intégré au texte des messages.
	const resendDisabled = busy || accountLocked;
	const resendLink = (
		<Text
			style={[styles.resendLink, resendDisabled && styles.resendDisabled]}
			disabled={resendDisabled}
			onPress={requestCode}
		>
			{t('forgotPassword.resend')}
		</Text>
	);

	const passwordError = passwordIssue(password);
	const confirmError: BoxConfigurationIssue | '' = !confirmPassword
		? 'confirmRequired'
		: !passwordError && confirmPassword !== password
		? 'passwordMismatch'
		: '';
	const messageFor = (issue: BoxConfigurationIssue | '', shown: boolean) =>
		shown && issue
			? t(`validation.${issue}`, { min: PASSWORD_MIN_LENGTH })
			: undefined;

	const submitPassword = async () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		if (passwordError || confirmError) {
			setTouched({ password: true, confirmPassword: true });
			return;
		}
		setBusy(true);
		setError('');
		const res = await authenticationService.resetPassword(
			login,
			code.trim(),
			password
		);
		setBusy(false);
		if (res.res) {
			// Retour direct à la connexion, le nouveau mot de passe déjà saisi.
			props.navigation.popTo(
				'Signin',
				{ resetPassword: password },
				{ merge: true }
			);
		} else if (isCodeFailure(res)) {
			// Le code n'est plus accepté (expiré entre-temps…) : retour à sa
			// saisie, le nouveau mot de passe reste en mémoire.
			setStep('code');
			handleCodeFailure(res);
		} else {
			ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
			setError(res.error || t('forgotPassword.resetFailed'));
		}
	};

	const passwordMessage = messageFor(passwordError, touched.password);
	const confirmMessage = messageFor(confirmError, touched.confirmPassword);

	return (
		// Un tap hors des champs ferme le clavier.
		<Pressable
			style={{ flex: 1, marginTop: 25, gap: 28 }}
			accessible={false}
			onPress={Keyboard.dismiss}
		>
			<View style={{ alignItems: 'center' }}>
				<Logo width={'70'} height={'70'} />
			</View>
			<View style={styles.card}>
				<View style={{ gap: 8 }}>
					<Text style={styles.label}>{t('signIn.boxId')}</Text>
					<TextInput
						style={[styles.input, InputStyle.inputDisabled]}
						value={login}
						editable={false}
					/>

					{step === 'code' ? (
						<>
							{codeSent && !codeUnusable ? (
								<InfoBox
									message={t('forgotPassword.codeSent')}
									style={styles.warning}
								/>
							) : null}
							{expired ? (
								<WarningBox hideIcon={true} style={styles.warning}>
									<Text style={styles.warningText}>
										{t('forgotPassword.codeExpired')} {resendLink}
									</Text>
								</WarningBox>
							) : null}
							{locked && !expired ? (
								<WarningBox hideIcon={true} style={styles.warning}>
									<Text style={styles.warningText}>
										{t('forgotPassword.codeLocked')} {resendLink}
									</Text>
								</WarningBox>
							) : null}
							{error ? (
								<ErrorBox
									message={
										// Envoi initial raté : pas de cadre orange,
										// le renvoi se propose ici.
										!codeSent && !busy ? (
											<>
												{error} {resendLink}
											</>
										) : (
											error
										)
									}
									style={styles.errorBox}
								/>
							) : null}
							{!codeUnusable ? (
								<>
									<View style={styles.codeLine}>
										<CodeInput
											value={code}
											onChangeText={value => {
												setCode(value);
												if (error) setError('');
												// Code complet : validation sans attendre le bouton.
												if (
													value.length === CODE_LENGTH &&
													value !== code &&
													!busy &&
													!accountLocked
												)
													validateCode(value);
											}}
											onSubmit={() => {
												if (codeComplete && !busy && !accountLocked)
													validateCode(code);
											}}
										/>
										{codeSent ? (
											<CountdownCircle
												remaining={remaining}
												total={CODE_TTL_SECONDS}
											/>
										) : null}
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
					) : (
						<>
							<InfoBox
								message={t('forgotPassword.chooseNew')}
								style={styles.warning}
							/>
							<Text style={styles.label}>
								{t('forgotPassword.chooseNewLabel')}
							</Text>
							<PasswordInput
								style={[
									styles.input,
									passwordMessage ? styles.fieldInvalid : null
								]}
								placeholder={t('boxConfig.newPassword')}
								placeholderTextColor={placeholderColor}
								textContentType={'newPassword'}
								value={password}
								onChangeText={setPassword}
								onBlur={() =>
									setTouched(s => ({ ...s, password: true }))
								}
							/>
							{passwordMessage ? (
								<Text style={styles.fieldError}>
									{passwordMessage}
								</Text>
							) : null}
							<PasswordInput
								style={[
									styles.input,
									confirmMessage ? styles.fieldInvalid : null
								]}
								placeholder={t('boxConfig.confirmPassword')}
								placeholderTextColor={placeholderColor}
								textContentType={'newPassword'}
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								onBlur={() =>
									setTouched(s => ({
										...s,
										confirmPassword: true
									}))
								}
							/>
							{confirmMessage ? (
								<Text style={styles.fieldError}>
									{confirmMessage}
								</Text>
							) : null}
							<OutlineButton
								label={t('forgotPassword.validate')}
								icon={faCheck}
								busy={busy}
								disabled={accountLocked}
								onPress={submitPassword}
							/>
							{error ? (
								<Text style={styles.submitError}>{error}</Text>
							) : null}
						</>
					)}
				</View>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		alignSelf: 'stretch',
		backgroundColor: 'white',
		marginHorizontal: 20,
		borderRadius: 12,
		padding: 20,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	label: {
		color: COLORS.primary,
		fontSize: 15
	},
	input: {
		...inputText,
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	fieldInvalid: {
		borderColor: COLORS.danger
	},
	fieldError: {
		color: COLORS.danger,
		fontSize: 13
	},
	submitError: {
		color: COLORS.danger,
		fontSize: 13,
		textAlign: 'center',
		marginTop: 8
	},
	warning: {
		marginVertical: 8
	},
	warningText: {
		color: WARNING_COLORS.text,
		fontSize: 14
	},
	resendLink: {
		fontWeight: 'bold',
		textDecorationLine: 'underline'
	},
	resendDisabled: {
		opacity: 0.5
	},
	errorBox: {
		marginBottom: 8
	},
	codeLine: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	codeBusy: {
		marginTop: 12
	}
});
