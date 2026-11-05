import React, {useCallback, useEffect} from 'react';
import {
	FlatList,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Spinner from 'react-native-loading-spinner-overlay';
import i18n from 'i18next';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useNavigation} from '@react-navigation/native';
import {placeholderColor} from '../../styles/components/common/Input';
import {hapticOptions} from '../../data/cycleTypes';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {saveSigninData} from '../../components/common/RememberMeManager';
import {getBoxEndpoint, hotspotService} from '../../../services/hotspot';
import {boxGet, boxPost, boxUrl} from '../../../services/http';
import {
	PendingCoordinates,
	startLocalCoordinates
} from '../../../services/geolocation/GeolocationService';
import {
	BoxConfigurationForm,
	isBoxConfigurationValid,
	PASSWORD_MIN_LENGTH,
	validateBoxConfiguration
} from '../../../services/validation';
import {
	readBoxConfigurationDraft,
	saveBoxConfigurationDraft
} from './boxConfigurationDraft';

/** Routes de la box appelées depuis cet écran. */
const NETWORKS_PATH = '/updater/getNetworksList';
const CONFIGURE_PATH = '/updater/configure';

/** Au-delà, une box injoignable ferait patienter indéfiniment. */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Budget accordé à `configure`. Il n'a plus qu'à couvrir un accusé de
 * réception : ce n'est pas cette réponse qui confirme la configuration, mais
 * l'état Wi-Fi que `BoxHandover` ira lire ensuite sur la box.
 */
const CONFIGURE_TIMEOUT_MS = 20000;

/**
 * Ce que la soumission accepte encore d'attendre pour la position, si elle
 * n'est pas déjà arrivée. Court : la box se configure très bien sans, alors
 * que retarder `configure` coûte cher — c'est du temps passé sur le point
 * d'accès sans rien émettre, et il peut tomber pendant ce temps-là.
 */
const COORDINATES_GRACE_MS = 2000;

type NetworkOption = {
	label: string;
	value: string;
};

/**
 * Configuration de la box une fois le téléphone connecté à son hotspot.
 *
 * Tout passe en HTTPS sur le hotspot — la liste des réseaux vus par la box, puis
 * le formulaire — contrairement à `deviceSettings`, qui fait la même chose en
 * BLE. Les deux écrans coexistent : l'appairage BLE reste utilisé par les box
 * qui n'exposent pas de point d'accès.
 */
export function BoxConfiguration(props: any) {
	// Repris du brouillon quand on revient ici après un échec de bascule :
	// refaire saisir six champs pour corriger une clé Wi-Fi serait une punition.
	// Fusionné aux valeurs par défaut : un brouillon d'une version antérieure du
	// formulaire n'a pas forcément tous les champs.
	const [form, setForm] = React.useState<BoxConfigurationForm>(() => ({
		deviceName: '',
		ssid: '',
		psk: '',
		boxIdentifier: '',
		email: '',
		useDefaultPassword: true,
		password: '',
		confirmPassword: '',
		...readBoxConfigurationDraft()
	}));
	// Un champ jamais rempli ne doit pas être signalé en rouge d'entrée de jeu :
	// son erreur n'apparaît qu'une fois qu'il a été touché, ou à la soumission.
	const [touched, setTouched] = React.useState<
		Partial<Record<keyof BoxConfigurationForm, boolean>>
	>({});
	const [networks, setNetworks] = React.useState<NetworkOption[]>([]);
	const [dropdownOpen, setDropdownOpen] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const [busyMessage, setBusyMessage] = React.useState('');
	const [error, setError] = React.useState('');
	// Une tentative de configuration a échoué : le bouton devient un bouton de
	// reprise, plutôt que de laisser croire que rien ne s'est passé.
	const [configureFailed, setConfigureFailed] = React.useState(false);

	const set = <K extends keyof BoxConfigurationForm>(
		field: K,
		value: BoxConfigurationForm[K]
	) => {
		setForm(previous => ({...previous, [field]: value}));
		setTouched(previous => ({...previous, [field]: true}));
	};

	const {t} = useTranslation(['access', 'common']);
	const nav = useNavigation();

	useEffect(() => {
		nav.setOptions({
			headerRight: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				),
			headerLeft: brandLogo
		});
	}, [nav, props.navigation]);

	/** Réseaux Wi-Fi vus par la box, à rejoindre une fois configurée. */
	const loadNetworks = useCallback(async () => {
		setIsLoading(true);
		setBusyMessage(t('boxConfig.searchingNetworks'));
		setError('');
		try {
			const url = await boxUrl(NETWORKS_PATH);
			const {status, body} = await boxGet(url, REQUEST_TIMEOUT_MS);
			if (status < 200 || status >= 300) {
				throw new Error(`HTTP ${status}`);
			}
			setNetworks(parseNetworks(body));
		} catch (e) {
			console.warn('[BoxConfiguration] getNetworksList:', e);
			const err = e instanceof Error ? e : new Error(String(e));
			setError(
				err.name === 'AbortError'
					? t('boxConfig.noResponse')
					: t('boxConfig.networksUnavailable', {error: err.message})
			);
		} finally {
			setIsLoading(false);
		}
	}, [t]);

	useEffect(() => {
		loadNetworks();
	}, [loadNetworks]);

	// L'identifiant de la box est le `deviceId` du QR scanné, sans `.local` : il
	// vient du QR et n'a pas à être ressaisi. Toujours relu, même par-dessus
	// un brouillon, qui pourrait venir d'une autre box.
	useEffect(() => {
		let cancelled = false;
		getBoxEndpoint().then(endpoint => {
			// Un endpoint enregistré avant l'ajout de `deviceId` n'en a pas.
			if (cancelled || !endpoint?.deviceId) return;
			const boxIdentifier = endpoint.deviceId.replace(/\.local$/i, '');
			setForm(previous => ({...previous, boxIdentifier}));
		});
		return () => {
			cancelled = true;
		};
	}, []);

	// Position demandée dès l'affichage plutôt qu'au moment d'envoyer : voir
	// `startLocalCoordinates`. Ici le retard se paierait doublement, puisqu'il
	// s'écoulerait sur le point d'accès de la box sans que rien ne soit émis.
	const coordinatesRef = React.useRef<PendingCoordinates | undefined>(
		undefined
	);
	useEffect(() => {
		coordinatesRef.current = startLocalCoordinates();
	}, []);

	// Le point d'accès peut aussi tomber avant toute soumission — box
	// redémarrée, hors de portée. Relâcher la demande réseau évite alors
	// qu'Android reste à guetter ce SSID au lieu de rendre la main au Wi-Fi
	// enregistré. Après soumission, c'est `BoxHandover` qui en est chargé.
	useEffect(() => hotspotService.onLost(() => hotspotService.disconnect()), []);

	const errors = validateBoxConfiguration(form);
	const isFormValid = isBoxConfigurationValid(errors);

	/**
	 * Message à afficher sous un champ : rien tant qu'il n'a pas été touché —
	 * sauf l'identifiant, en lecture seule, qui ne le sera jamais.
	 */
	const errorFor = (field: keyof BoxConfigurationForm) => {
		const shown = touched[field] || field === 'boxIdentifier';
		const issue = shown ? errors[field] : undefined;
		return issue
			? t(`validation.${issue}`, {min: PASSWORD_MIN_LENGTH})
			: undefined;
	};

	/**
	 * Refus de la box : on reste sur le formulaire, la saisie intacte et le
	 * bouton prêt à repartir. Elle a répondu, donc son point d'accès tient
	 * toujours — c'est le seul cas où corriger et renvoyer a un sens.
	 */
	const fail = (message: string) => {
		console.warn('[BoxConfiguration] configure:', message);
		setError(message);
		setConfigureFailed(true);
		setIsLoading(false);
	};

	const configure = async () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);

		// Le bouton reste pressable même grisé : c'est ici qu'un formulaire
		// invalide montre enfin ce qui bloque, y compris sur les champs jamais
		// touchés.
		if (!isFormValid) {
			setTouched({
				deviceName: true,
				ssid: true,
				psk: true,
				boxIdentifier: true,
				email: true,
				password: true,
				confirmPassword: true
			});
			return;
		}

		setIsLoading(true);
		setBusyMessage(t('boxConfig.configuring'));
		setError('');
		setConfigureFailed(false);

		// Retenu avant l'envoi : à partir d'ici cet écran peut être sorti de la
		// pile, et c'est le brouillon qui rendra la saisie si la bascule échoue.
		saveBoxConfigurationDraft(form);

		const deviceName = form.deviceName.trim();
		// C'est l'identifiant de la box, et non l'email, qui sert de login.
		const login = form.boxIdentifier.trim();
		const email = form.email.trim();
		const password = form.useDefaultPassword ? '' : form.password;

		// Préparé hors du try réseau : ni l'un ni l'autre ne parle à la box, et
		// leur échec n'aurait donc rien à dire sur la configuration. Best effort
		// pour la position : la box est configurée même sans GPS, le champ est
		// alors simplement omis — même contrat que l'appairage BLE.
		const localCoordinates = await coordinatesRef.current?.take(
			COORDINATES_GRACE_MS
		);
		const url = await boxUrl(CONFIGURE_PATH);

		// Seul un refus explicite retient ici : la box a répondu, elle a dit non,
		// et son point d'accès tient toujours — la saisie peut être corrigée et
		// renvoyée. Une requête restée sans réponse, elle, ne conclut rien : la
		// box coupe son point d'accès en appliquant la configuration, souvent
		// avant même de répondre. C'est `BoxHandover` qui tranchera, en allant
		// lire l'état Wi-Fi de la box une fois la bascule faite.
		try {
			const {status, body} = await boxPost(
				url,
				{
					deviceName,
					ssid: form.ssid,
					psk: form.psk,
					login,
					...(email ? {email} : {}),
					// Sans mot de passe, la box garde celui qu'elle a par défaut.
					useDefaultPassword: form.useDefaultPassword,
					...(form.useDefaultPassword ? {} : {password}),
					// La box en déduit elle-même son fuseau horaire.
					...(localCoordinates ? {localCoordinates} : {})
				},
				CONFIGURE_TIMEOUT_MS
			);

			if (status < 200 || status >= 300) {
				return fail(t('boxConfig.refusedHttp', {status, body}).trim());
			}
			// Une box qui répond « non » avec un 200 reste une box qui refuse.
			if (!isConfirmation(body)) {
				return fail(t('boxConfig.refused', {body}).trim());
			}
		} catch (e) {
			console.warn('[BoxConfiguration] configure (bascule ?):', e);
		}

		// Hors du try réseau : un échec de trousseau ne doit pas être présenté
		// comme un refus de la box, alors qu'elle a déjà accepté la config.
		// Le nom de la box sert aussi de nom de profil — c'est le seul libellé
		// que l'utilisateur ait saisi ici. Avec le mot de passe par défaut, que
		// l'app ne connaît pas, seul l'identifiant est retenu : il sera saisi à
		// la connexion.
		try {
			await saveSigninData(
				deviceName,
				login,
				login,
				password,
				true,
				''
			);
		} catch (e) {
			console.warn('[BoxConfiguration] saveSigninData:', e);
		}

		setIsLoading(false);

		// `reset` et non `navigate` : ce formulaire et le scanner qui le précède
		// n'ont plus de réseau pour travailler une fois le point d'accès fermé.
		// Les laisser dans la pile, c'est offrir un retour arrière vers un écran
		// mort. `Profiles` reste dessous comme point de repli.
		props.navigation.reset({
			index: 1,
			routes: [
				{name: 'Profiles'},
				{
					name: 'BoxHandover',
					params: {deviceName, ssid: form.ssid}
				}
			]
		});
	};

	const selectedLabel =
		networks.find(n => n.value === form.ssid)?.label || t('boxConfig.wifiNetwork');

	return (
		<KeyboardAvoidingView
			style={{flex: 1}}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView
				style={{flex: 1}}
				contentContainerStyle={{paddingTop: 50, paddingBottom: 40}}
				keyboardShouldPersistTaps="handled">
				<View style={{alignItems: 'center'}}>
					<View style={styles.badge}>
						<Icon name="wifi" size={30} color="#32404e" />
					</View>
				</View>

				<View style={styles.card}>
					<View style={{gap: 8, alignItems: 'center'}}>
						<Spinner
							visible={isLoading}
							color="#32404e"
							textContent={busyMessage}
							textStyle={styles.spinnerTextStyle}
						/>

						<TextInput
							style={[
								styles.field,
								errorFor('deviceName')
									? styles.fieldInvalid
									: null
							]}
							placeholder={t('boxConfig.deviceName')}
							placeholderTextColor={placeholderColor}
							autoCapitalize="none"
							autoCorrect={false}
							value={form.deviceName}
							onChangeText={value => set('deviceName', value)}
						/>
						<FieldError message={errorFor('deviceName')} />

						<View style={{width: '100%'}}>
							<TouchableOpacity
								style={[
									styles.input,
									{justifyContent: 'center'},
									errorFor('ssid') ? styles.fieldInvalid : null
								]}
								onPress={() => {
									setTouched(p => ({...p, ssid: true}));
									setDropdownOpen(!dropdownOpen);
								}}>
								<View style={styles.dropdownHeader}>
									<Text
										style={{
											fontSize: 20,
											color: form.ssid
												? '#000'
												: placeholderColor
										}}>
										{selectedLabel}
									</Text>
									<Icon
										name={
											dropdownOpen
												? 'chevron-up'
												: 'chevron-down'
										}
										size={14}
										color="#32404e"
									/>
								</View>
							</TouchableOpacity>
							{dropdownOpen && (
								<View style={styles.dropdown}>
									{networks.length === 0 ? (
										<TouchableOpacity
											style={styles.dropdownItem}
											onPress={() => {
												setDropdownOpen(false);
												loadNetworks();
											}}>
											<Text
												style={{
													fontSize: 18,
													color: placeholderColor
												}}>
												{t('boxConfig.noNetwork')}
											</Text>
										</TouchableOpacity>
									) : (
										<FlatList
											data={networks}
											keyExtractor={(_item, index) =>
												'network_' + index
											}
											renderItem={({
												item
											}: {
												item: NetworkOption;
											}) => (
												<TouchableOpacity
													style={[
														styles.dropdownItem,
														item.value ===
															form.ssid && {
															backgroundColor:
																'#EDF2F7'
														}
													]}
													onPress={() => {
														set('ssid', item.value);
														setDropdownOpen(false);
													}}>
													<Text style={{fontSize: 18}}>
														{item.label}
													</Text>
												</TouchableOpacity>
											)}
										/>
									)}
								</View>
							)}
						</View>
						<FieldError message={errorFor('ssid')} />

						<TextInput
							style={[
								styles.field,
								errorFor('psk') ? styles.fieldInvalid : null
							]}
							placeholder={t('boxConfig.psk')}
							placeholderTextColor={placeholderColor}
							secureTextEntry={true}
							textContentType={'password'}
							autoCapitalize="none"
							value={form.psk}
							onChangeText={value => set('psk', value)}
						/>
						<FieldError message={errorFor('psk')} />

						<TextInput
							style={[
								styles.field,
								styles.fieldReadonly,
								errorFor('boxIdentifier')
									? styles.fieldInvalid
									: null
							]}
							placeholder={t('boxConfig.boxIdentifier')}
							placeholderTextColor={placeholderColor}
							editable={false}
							value={form.boxIdentifier}
						/>
						<FieldError message={errorFor('boxIdentifier')} />
						<Text style={styles.loginReminder}>
							{t('boxConfig.boxIdentifierReminder')}
						</Text>

						<TextInput
							style={[
								styles.field,
								errorFor('email') ? styles.fieldInvalid : null
							]}
							placeholder={t('boxConfig.email')}
							placeholderTextColor={placeholderColor}
							keyboardType="email-address"
							textContentType={'emailAddress'}
							autoCapitalize="none"
							autoCorrect={false}
							value={form.email}
							onChangeText={value => set('email', value)}
						/>
						<FieldError message={errorFor('email')} />
						<Text style={styles.hint}>
							{t('boxConfig.emailRecoveryHint')}
						</Text>

						<View style={styles.choice}>
							{[true, false].map(useDefault => (
								<TouchableOpacity
									key={String(useDefault)}
									style={[
										styles.choiceItem,
										form.useDefaultPassword === useDefault &&
											styles.choiceItemSelected
									]}
									onPress={() =>
										setForm(previous => ({
											...previous,
											useDefaultPassword: useDefault
										}))
									}>
									<Text
										style={[
											styles.choiceText,
											form.useDefaultPassword ===
												useDefault &&
												styles.choiceTextSelected
										]}>
										{useDefault
											? t('boxConfig.defaultPassword')
											: t('boxConfig.newPassword')}
									</Text>
								</TouchableOpacity>
							))}
						</View>

						{form.useDefaultPassword ? (
							<Text style={styles.hint}>
								{t('boxConfig.defaultPasswordHint')}
							</Text>
						) : (
							<>

							<TextInput
								style={[
									styles.field,
									errorFor('password') ? styles.fieldInvalid : null
								]}
								placeholder={t('common:password')}
								placeholderTextColor={placeholderColor}
								secureTextEntry={true}
								textContentType={'newPassword'}
								autoCapitalize="none"
								value={form.password}
								onChangeText={value => set('password', value)}
							/>
							<FieldError message={errorFor('password')} />

							<TextInput
								style={[
									styles.field,
									errorFor('confirmPassword')
										? styles.fieldInvalid
										: null
								]}
								placeholder={t('boxConfig.confirmPassword')}
								placeholderTextColor={placeholderColor}
								secureTextEntry={true}
								textContentType={'newPassword'}
								autoCapitalize="none"
								value={form.confirmPassword}
								onChangeText={value => set('confirmPassword', value)}
							/>
							<FieldError message={errorFor('confirmPassword')} />
							</>
						)}

						{error ? (
							<Text style={styles.error}>{error}</Text>
						) : null}

						<TouchableOpacity
							style={[
								styles.submit,
								!isFormValid && styles.submitDisabled
							]}
							disabled={isLoading}
							onPress={configure}>
							<Text style={{color: 'white', fontSize: 20}}>
								{' '}
								{configureFailed ? t('common:retry') : t('boxConfig.configure')}{' '}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

/**
 * La box accorde-t-elle la configuration, ou répond-elle « non » avec un 2xx ?
 *
 * Seul un refus explicite est retenu comme tel — `false`, ou un objet dont le
 * verdict est faux. Le reste d'un 2xx compte pour un accord : les firmwares ne
 * s'accordent pas sur le corps renvoyé, et exiger une forme précise ferait
 * échouer le parcours sur une box parfaitement configurée.
 */
function isConfirmation(body: string): boolean {
	const trimmed = body.trim();
	if (trimmed === '') return true;

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return trimmed.toLowerCase() !== 'false';
	}

	if (typeof parsed === 'boolean') return parsed;
	if (parsed && typeof parsed === 'object') {
		const verdict = parsed as Record<string, unknown>;
		for (const key of ['success', 'ok', 'result']) {
			if (key in verdict) return Boolean(verdict[key]);
		}
	}
	return true;
}

/** Message d'erreur sous un champ, ou rien du tout — la place n'est pas réservée. */
const FieldError = ({message}: {message?: string}) =>
	message ? (
		<Text style={styles.fieldError}>{message}</Text>
	) : null;

/**
 * La box a déjà renvoyé deux formes pour cette route : un tableau d'objets
 * (`{name, isConfigured, in-use}`, comme la caractéristique BLE) et un tableau
 * de chaînes. Les deux sont acceptées plutôt que d'imposer un firmware précis.
 */
function parseNetworks(body: string): NetworkOption[] {
	const parsed = JSON.parse(body);
	const list = Array.isArray(parsed)
		? parsed
		: Array.isArray(parsed?.networks)
		? parsed.networks
		: [];

	return list
		.map((entry: any): NetworkOption | null => {
			if (typeof entry === 'string') {
				return {label: entry, value: entry};
			}
			const value = entry?.name ?? entry?.ssid;
			if (typeof value !== 'string' || value === '') return null;

			const tag =
				entry?.isConfigured && entry?.['in-use']
					? ` ${i18n.t('access:boxConfig.configuredTag')}`
					: '';
			return {label: `${value}${tag}`, value};
		})
		.filter((option: NetworkOption | null): option is NetworkOption =>
			Boolean(option)
		);
}

const styles = StyleSheet.create({
	badge: {
		width: 70,
		height: 70,
		borderRadius: 0.5 * 70,
		justifyContent: 'center',
		alignItems: 'center',
		borderColor: '#32404e',
		borderWidth: 7
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: 'white',
		marginTop: 12,
		marginHorizontal: 20,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22,
		borderRadius: 12,
		padding: 20
	},
	input: {
		height: 50,
		fontSize: 20,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	field: {
		width: '100%',
		height: 50,
		fontSize: 20,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12
	},
	loginReminder: {
		alignSelf: 'stretch',
		color: '#dd6b20',
		fontSize: 13,
		marginTop: -4,
		paddingHorizontal: 4
	},
	fieldReadonly: {
		backgroundColor: '#EDF2F7',
		color: '#4a5568'
	},
	fieldInvalid: {
		borderColor: '#d64545'
	},
	fieldError: {
		alignSelf: 'stretch',
		color: '#d64545',
		fontSize: 13,
		marginTop: -4,
		paddingHorizontal: 4
	},
	submit: {
		alignSelf: 'stretch',
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 6,
		marginTop: 4,
		backgroundColor: '#32404e'
	},
	choice: {
		alignSelf: 'stretch',
		flexDirection: 'row',
		borderWidth: 1,
		borderColor: '#32404e',
		borderRadius: 12,
		overflow: 'hidden'
	},
	choiceItem: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 6,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'white'
	},
	choiceItemSelected: {
		backgroundColor: '#32404e'
	},
	choiceText: {
		fontSize: 15,
		color: '#32404e',
		textAlign: 'center'
	},
	choiceTextSelected: {
		color: 'white'
	},
	hint: {
		alignSelf: 'stretch',
		color: '#4a5568',
		fontSize: 14,
		paddingHorizontal: 4
	},
	submitDisabled: {
		backgroundColor: '#a5a4a5'
	},
	error: {
		color: '#d64545',
		fontSize: 14,
		textAlign: 'center',
		alignSelf: 'stretch'
	},
	spinnerTextStyle: {
		color: '#32404e',
		fontSize: 15,
		marginBottom: 50
	},
	dropdownHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	dropdown: {
		width: '100%',
		maxHeight: 200,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderTopWidth: 0,
		borderBottomLeftRadius: 12,
		borderBottomRightRadius: 12,
		backgroundColor: 'white'
	},
	dropdownItem: {
		paddingVertical: 12,
		paddingHorizontal: 12
	}
});

export default BoxConfiguration;
