import React from 'react';
import {
	Alert,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTranslation } from 'react-i18next';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { placeholderColor } from '../../styles/components/common/Input';
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
import Svg, { Circle } from 'react-native-svg';

type Step = 'code' | 'password';

/** Durée de validité du code de récupération. */
const CODE_TTL_SECONDS = 1 * 60;

/** Compte à rebours circulaire, le temps restant affiché au centre. */
const CountdownCircle = ({
	remaining,
	total,
	size = 90,
	strokeWidth = 6
}: {
	remaining: number;
	total: number;
	size?: number;
	strokeWidth?: number;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const progress = total > 0 ? remaining / total : 0;
	const minutes = Math.floor(remaining / 60);
	const seconds = String(remaining % 60).padStart(2, '0');
	return (
		<View style={[styles.countdown, { width: size, height: size }]}>
			<Svg
				width={size}
				height={size}
				// Le cercle part du haut et se vide dans le sens horaire.
				style={{ transform: [{ rotate: '-90deg' }] }}
			>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={COLORS_TRACK}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={COLORS.primary}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={circumference * (1 - progress)}
					fill="none"
				/>
			</Svg>
			<Text style={styles.countdownText}>
				{minutes}:{seconds}
			</Text>
		</View>
	);
};

const COLORS_TRACK = '#CBD5E0';

/** Échec lié au code (et non au mot de passe) : il faut en saisir un autre. */
const isCodeFailure = (res: BoxLoginResult) =>
	!!res.status && /RECOVERY_CODE/i.test(res.status);
const isCodeExpired = (res: BoxLoginResult) =>
	!!res.status && /EXPIRED/i.test(res.status);
/** Plus aucune tentative : le code est grillé, seul un renvoi débloque. */
const isCodeLocked = (res: BoxLoginResult) =>
	res.attemptsRemaining === 0 ||
	(!!res.status && /LOCKED|BLOCKED|TOO_MANY/i.test(res.status));

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

	const validateCode = async () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setBusy(true);
		setError('');
		const res = await authenticationService.verifyRecoveryCode(
			login,
			code.trim()
		);
		setBusy(false);
		if (res.res) {
			setStep('password');
		} else {
			handleCodeFailure(res);
		}
	};

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
			Alert.alert(
				t('forgotPassword.successTitle'),
				t('forgotPassword.success'),
				[{ text: 'OK', onPress: () => props.navigation.goBack() }]
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
		<View style={{ flex: 1, marginTop: 25, gap: 28 }}>
			<View style={{ alignItems: 'center' }}>
				<Logo width={'70'} height={'70'} />
			</View>
			<View style={styles.card}>
				<View style={{ gap: 8 }}>
					<Text style={styles.label}>{t('signIn.boxId')}</Text>
					<TextInput
						style={[styles.input, styles.readOnly]}
						value={login}
						editable={false}
					/>

					{step === 'code' ? (
						<>
							{codeSent && !codeUnusable ? (
								<>
									<Text style={styles.info}>
										{t('forgotPassword.codeSent')}
									</Text>
									<CountdownCircle
										remaining={remaining}
										total={CODE_TTL_SECONDS}
									/>
								</>
							) : null}
							{expired ? (
								<Text style={styles.info}>
									{t('forgotPassword.codeExpired')}
								</Text>
							) : null}
							{locked && !expired ? (
								<Text style={styles.info}>
									{t('forgotPassword.codeLocked')}
								</Text>
							) : null}
							{!codeUnusable ? (
								<>
									<TextInput
										style={styles.input}
										placeholder={t('forgotPassword.code')}
										placeholderTextColor={placeholderColor}
										textContentType={'oneTimeCode'}
										autoComplete={'one-time-code'}
										autoCapitalize={'none'}
										autoCorrect={false}
										value={code}
										onChangeText={value => {
											setCode(value);
											if (error) setError('');
										}}
									/>
									<OutlineButton
										label={t('forgotPassword.validate')}
										icon={faCheck}
										busy={busy}
										disabled={!code.trim() || accountLocked}
										onPress={validateCode}
									/>
									{error ? (
										<Text style={styles.submitError}>
											{error}
										</Text>
									) : null}
								</>
							) : null}
							{codeUnusable && error ? (
								<Text style={styles.submitError}>{error}</Text>
							) : null}
							<TouchableOpacity
								disabled={busy || accountLocked}
								onPress={requestCode}
							>
								<Text
									style={[
										styles.link,
										accountLocked && styles.linkDisabled
									]}
								>
									{t('forgotPassword.resend')}
								</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							<Text style={styles.info}>
								{t('forgotPassword.chooseNew')}
							</Text>
							<TextInput
								style={[
									styles.input,
									passwordMessage ? styles.fieldInvalid : null
								]}
								placeholder={t('boxConfig.newPassword')}
								placeholderTextColor={placeholderColor}
								secureTextEntry={true}
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
							<TextInput
								style={[
									styles.input,
									confirmMessage ? styles.fieldInvalid : null
								]}
								placeholder={t('boxConfig.confirmPassword')}
								placeholderTextColor={placeholderColor}
								secureTextEntry={true}
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
		</View>
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
		height: 50,
		fontSize: 20,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12,
		color: COLORS.primary
	},
	readOnly: {
		backgroundColor: '#F1F5F9'
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
	info: {
		color: COLORS.primary,
		fontSize: 15,
		marginVertical: 8
	},
	countdown: {
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		marginVertical: 8
	},
	countdownText: {
		position: 'absolute',
		color: COLORS.primary,
		fontSize: 20,
		fontWeight: 'bold'
	},
	link: {
		color: COLORS.primary,
		fontSize: 15,
		textAlign: 'center',
		marginTop: 12
	},
	linkDisabled: {
		opacity: 0.4
	}
});
