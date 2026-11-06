import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React from 'react';
import {
	Keyboard,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import {AppSwitch} from '../../components/common/AppSwitch';
import {KeyboardAwareScrollView} from '../../components/common/KeyboardAwareScrollView';
import {InputStyle, placeholderColor, inputText} from '../../styles/components/common/Input';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../data/cycleTypes';
import Spinner from 'react-native-loading-spinner-overlay';
import {
	findProfileByLogin,
	getSigninData
} from '../../components/common/RememberMeManager';
import Logo from '../../../../hydrophyto.svg';
import {connect} from 'react-redux';
import {
	login,
	setIsConnected
} from '../../../module/process/infrasctructure/store/actions/state';
import {useNavigation} from '@react-navigation/native';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {useTranslation} from 'react-i18next';
import {faRightToBracket} from '@fortawesome/free-solid-svg-icons';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';
import {OutlineButton, useLockedUntil} from './accessUi';
import {ErrorBox} from '../../components/common/ErrorBox';
import {PasswordInput} from '../../components/common/PasswordInput';

export function SignIn(props: any) {
	const {t} = useTranslation(['access', 'common']);
	// Identifiant de la box : saisi une seule fois, à la configuration de la
	// box ou à la création d'un profil. Une fois connu (profil existant ou
	// arrivée depuis la configuration), il reste en lecture seule.
	const presetLogin: string = props.route.params?.login ?? '';
	// Retour après un changement de mot de passe : le profil qui mémorise ce
	// login est repris tel quel (nom, « se souvenir de moi ») sans relire le
	// trousseau, qui ne contient que l'ancien mot de passe ; la connexion y
	// enregistre le nouveau.
	const passwordChanged = !!props.route.params?.passwordChanged;
	const changedProfile: string =
		(passwordChanged && props.route.params?.profile) || '';
	const [loginLocked, setLoginLocked] = React.useState(!!presetLogin);
	const [signinData, setSigninData] = React.useState({
		login: presetLogin,
		password: '',
		rememberCredentials: !!changedProfile,
		profile: changedProfile
	});
	const [isLoading, setIsLoading] = React.useState(false);
	// Message affiché sous le bouton (plus aucune popup sur cet écran) ; il
	// disparaît dès que l'utilisateur modifie un champ.
	const [message, setMessage] = React.useState('');
	// Compte bloqué par la box après trop d'échecs (`ACCOUNT_LOCKED`) : le
	// bouton reste désactivé jusqu'à `lockedUntil`. Le blocage est mémorisé par
	// le service, par identifiant, pour survivre à une navigation.
	const [lock, setLock] = React.useState<{
		until: number;
		message?: string;
	} | null>(null);
	const locked = useLockedUntil(lock?.until ?? null);
	React.useEffect(() => {
		setLock(
			signinData.login
				? authenticationService.getAccountLock(signinData.login)
				: null
		);
	}, [signinData.login]);
	// Retour de « mot de passe oublié » : le nouveau mot de passe est
	// pré-rempli, puis retiré des paramètres pour ne pas traîner dans l'état
	// de navigation.
	const resetPassword: string | undefined =
		props.route.params?.resetPassword;
	React.useEffect(() => {
		if (!resetPassword) return;
		setMessage('');
		setSigninData(data => ({...data, password: resetPassword}));
		props.navigation.setParams({resetPassword: undefined});
	}, [resetPassword, props.navigation]);
	const updateField = (field: Partial<typeof signinData>) => {
		setMessage('');
		setSigninData(data => ({...data, ...field}));
	};
	// Règles du bouton « Se connecter » : identifiant et mot de passe requis,
	// et compte non bloqué. Pendant l'appel, il affiche un loader.
	const missingFields = !signinData.login?.trim() || !signinData.password;
	const shownMessage = locked
		? lock?.message || t('common:errors.unexpected')
		: message;
	const nav = useNavigation();
	React.useEffect(() => {
		nav.setOptions({
			headerTitleAlign: 'center',
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		const fetchCredentials = async (profile: string) => {
			try {
				const sd = await getSigninData(profile);
				if (sd) {
					const savedLogin = sd.login || presetLogin;
					setSigninData({...sd, login: savedLogin});
					if (savedLogin) setLoginLocked(true);
					if (sd.credentialsError === 'cancelled') {
						setMessage(t('signIn.credentialsCancelled'));
					} else if (sd.credentialsError === 'unavailable') {
						setMessage(t('signIn.credentialsUnavailable'));
					} else if (sd.login && sd.password && sd.profile) {
						//await onLogin(sd);
					} else {
						setMessage(t('signIn.missingInfo'));
					}
				}
			} catch (error) {
				console.error('Error fetching checkValue or email:', error);
			}
		};

		if (props.route.params?.profile && !passwordChanged) {
			fetchCredentials(props.route.params.profile);
		}
	}, []);

	const onLogin = async (data: any) => {
		// Le focus quitte le champ : le clavier se referme pendant l'appel.
		Keyboard.dismiss();
		setMessage('');
		// « Se souvenir de moi » crée (ou renomme) le profil : refusé si un
		// autre profil utilise déjà ce login.
		if (data.rememberCredentials) {
			const owner = await findProfileByLogin(
				data.login,
				props.route.params?.profile
			);
			if (owner) {
				ReactNativeHapticFeedback.trigger('notificationError', hapticOptions);
				setMessage(t('signIn.loginAlreadyUsed', {profile: owner}));
				return;
			}
		}
		setIsLoading(true);
		props
			.login(
				data.login,
				data.password,
				data.rememberCredentials,
				data.profile,
				props.route.params?.profile,
				data.login
			)
			.then((res: any) => {
				if (res && !res.res) {
					ReactNativeHapticFeedback.trigger(
						'notificationError',
						hapticOptions
					);
					// Blocage : son message vit dans `lock` et s'efface seul à
					// l'échéance ; les autres erreurs restent jusqu'à la saisie.
					const accountLock = authenticationService.getAccountLock(
						data.login
					);
					setLock(accountLock);
					setMessage(
						accountLock
							? ''
							: res.error || t('common:errors.unexpected')
					);
					setIsLoading(false);
				}
			})
			.catch((error: any) => {
				console.error('Error caught:', error);
				setIsLoading(false);
			});
	};

	return (
		// Le champ actif (et l'encadré d'avertissement en dessous) défile
		// au-dessus du clavier ; un appui hors des champs le referme.
		<KeyboardAwareScrollView
			style={{flex: 1}}
			contentContainerStyle={{paddingTop: 25, paddingBottom: 24}}
			keyboardDismissMode="on-drag"
			extraOffset={120}>
			<View style={{gap: 16, alignItems: 'center'}}>
				<Spinner
					visible={isLoading}
					color="#32404e"
					textStyle={styles.spinnerTextStyle}
				/>
				<View style={{alignItems: 'center'}}>
					<Logo width={'70'} height={'70'} />
				</View>
				<View
					style={{
						gap: 8,
						marginVertical: 4,
						alignSelf: 'stretch'
					}}>
					<View
						style={{
							alignSelf: 'stretch',
							backgroundColor: 'white',
							marginTop: 8,
							marginHorizontal: 20,
							borderRadius: 12,
							padding: 20,
							elevation: 3,
							shadowColor: '#000',
							shadowOffset: {width: 0, height: 1},
							shadowOpacity: 0.22,
							shadowRadius: 2.22
						}}>
						<View style={{gap: 8}}>
							<TextInput
								value={
									signinData.rememberCredentials
										? signinData.profile
										: undefined
								}
								style={styles.input}
								placeholder={t('profile')}
								placeholderTextColor={placeholderColor}
								onChangeText={profile => updateField({profile})}
							/>
							<TextInput
								value={
									loginLocked || signinData.rememberCredentials
										? signinData.login
										: undefined
								}
								editable={!loginLocked}
								textContentType={'username'}
								style={[
									styles.input,
									loginLocked && InputStyle.inputDisabled
								]}
								placeholder={t('signIn.boxId')}
								placeholderTextColor={placeholderColor}
								onChangeText={login => updateField({login})}
							/>
							<PasswordInput
								style={styles.input}
								placeholder={t('common:password')}
								placeholderTextColor={placeholderColor}
								textContentType={'newPassword'}
								value={signinData.password}
								onChangeText={password => updateField({password})}
								returnKeyType={'go'}
								onSubmitEditing={() => {
									if (!locked && !missingFields && !isLoading) {
										onLogin(signinData);
									}
								}}
							/>
							{shownMessage ? (
								<ErrorBox message={shownMessage} />
							) : null}

							<View
								style={{
									flexDirection: 'row',
									marginLeft: 40,
									marginRight: 40,
									alignSelf: 'center',
									alignItems: 'center'
								}}>
								<AppSwitch
									style={{marginRight: 12}}
									value={signinData.rememberCredentials}
									onValueChange={checked => {
										setSigninData({
											login: signinData.login,
											password: signinData.password,
											rememberCredentials: checked,
											profile: signinData.profile
										});
									}}
								/>
								<Text
									style={{
										marginTop: 5,
										color: '#32404e',
										fontSize: 15
									}}>
									{' '}
									{t('signIn.rememberMe')}
								</Text>
							</View>
							<OutlineButton
								label={t('signIn.submit')}
								icon={faRightToBracket}
								style={{marginTop: 4}}
								busy={isLoading}
								disabled={locked || missingFields}
								onPress={async () => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									await onLogin(signinData);
								}}
							/>
							<TouchableOpacity
								onPress={() => {
									Keyboard.dismiss();
									if (!signinData.login?.trim()) {
										setMessage(t('signIn.boxIdRequired'));
										return;
									}
									props.navigation.navigate('ForgotPassword', {
										login: signinData.login.trim()
									});
								}}>
								<Text
									style={{
										color: '#32404e',
										fontSize: 15,
										textAlign: 'center',
										marginTop: 4
									}}>
									{t('signIn.forgotPassword')}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>

			{/* <VStack
				marginLeft="10"
				marginRight="10"
				marginBottom={5}
				alignSelf="center">
				<IconButton
					_pressed={{_icon: {size: 35}}}
					variant="unstyled"
					alignSelf="center"
					size={35}
					icon={
						<Icon
							name={'arrow-alt-circle-left'}
							size={30}
							color="#32404e"
						/>
					}
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.navigate('Profiles');
					}}
				/>
			</VStack> */}
		</KeyboardAwareScrollView>
	);
}

const mapStateToProps = function (state: any) {
	return {
		isConnected: state.status?.isConnected
	};
};

export default connect(mapStateToProps, {
	login,
	setIsConnected
})(SignIn);

const styles = StyleSheet.create({
	input: {
		...inputText,
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	spinnerTextStyle: {
		color: '#32404e',
		fontSize: 15,
		marginBottom: 50
	}
});
