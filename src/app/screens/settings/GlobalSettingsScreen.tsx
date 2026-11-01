import React, {useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	Linking,
	Pressable,
	StyleSheet,
	Text,
	View
} from 'react-native';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faCircleInfo,
	faLocationDot,
	faSyncAlt,
	faTrafficLight
} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {
	DragableForm,
	InputForm
} from '../../components/common/FormComponents';
import {SettingsScrollView} from '../../components/common/SettingsScrollView';
import {
	MenuAccordion,
	MenuGroup
} from '../../components/common/cycleMenu';
import {hapticOptions} from '../../data/cycleTypes';
import {
	loadSettings,
	saveSettings
} from '../../../module/process/infrasctructure/store/actions/settings';
import {
	getLocationPermissionStatus,
	readLocalCoordinates,
	LocationPermissionStatus
} from '../../../services/geolocation/GeolocationService';

// Rang par défaut des modes (0 = plus prioritaire), aligné sur
// `DEFAULT_MODE_RANKS` côté box : utilisé tant que la box n'envoie pas de
// `modeRanks`.
const DEFAULT_MODE_RANKS: Record<string, number> = {
	MANUAL: 0,
	SCHEDULED: 1,
	TRIGGER: 2
};

// `modeRanks` ({mode: rang}) -> liste triée par rang pour le DragableForm.
// Seuls les modes connus sont gardés (ex : l'ancien `SCHEDULE` est ignoré) ;
// ceux absents de la box sont complétés avec les valeurs par défaut.
const toModeRankList = (modeRanks?: Record<string, number>) => {
	const ranks = Object.keys(DEFAULT_MODE_RANKS).reduce(
		(acc, mode) => ({
			...acc,
			[mode]: modeRanks?.[mode] ?? DEFAULT_MODE_RANKS[mode]
		}),
		{} as Record<string, number>
	);
	return Object.keys(ranks)
		.sort((a, b) => ranks[a] - ranks[b])
		.map(mode => ({mode}));
};

// Liste réordonnée -> `modeRanks` : le rang est la position dans la liste.
const toModeRanks = (list: {mode: string}[]) =>
	list.reduce(
		(acc, x, index) => ({...acc, [x.mode]: index}),
		{} as Record<string, number>
	);

const toFormValues = (settings: any) => ({
	longitude: settings?.localCoordinates?.longitude?.toString() ?? '',
	latitude: settings?.localCoordinates?.latitude?.toString() ?? '',
	modeRanks: toModeRankList(settings?.modeRanks)
});

// Global settings area: exposes the box `localCoordinates` (longitude /
// latitude) and the mode priority (`modeRanks`), fetched from the backend
// (front/box/fetch/settings) and persisted with the header Save button
// (front/box/sync/settings). The refresh button only *prefills* the two
// coordinate fields with the phone GPS position — nothing is sent to the box
// until Save.
export function GlobalSettingsScreen(props: any) {
	const settings = props.settings;
	// Champs vides tant que le fetch n'a pas répondu : le reset ci-dessous les
	// remplit dès que les settings arrivent.
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	// Accès refusé : plus de bouton refresh, l'OS n'affichera plus la popup.
	const [permissionStatus, setPermissionStatus] =
		useState<LocationPermissionStatus>(getLocationPermissionStatus());

	const {
		control,
		handleSubmit,
		setValue,
		reset,
		formState: {errors, isDirty}
	} = useForm<any>({
		defaultValues: toFormValues(settings),
		mode: 'onChange'
	});

	// Intention de sortie explicite (save / cancel) : le guard `beforeRemove`
	// ne redemande pas confirmation dans ce cas.
	const leaveIntentRef = useRef<string | null>(null);

	useEffect(() => {
		props.loadSettings();
	}, []);

	// Les settings arrivent (ou changent) : on réinitialise le formulaire, ce
	// qui remet aussi `isDirty` à false. Une édition en cours n'est pas écrasée.
	useEffect(() => {
		if (!settings || isDirty) return;
		reset(toFormValues(settings));
	}, [settings]);

	// Préremplissage depuis le GPS du téléphone : best effort, on ne touche pas
	// aux champs quand la position n'est pas disponible.
	const onRefreshCoordinates = async () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setIsRefreshing(true);
		// maximumAge 0 : chaque appui redemande un point GPS frais au lieu de
		// resservir le dernier fix connu. Le timeout couvre le temps de réponse
		// à la popup d'autorisation iOS, qui peut réapparaître à tout appui
		// (« Autoriser une fois » expire quand l'app passe en arrière-plan).
		let result;
		try {
			result = await readLocalCoordinates(20000, 0);
		} finally {
			setIsRefreshing(false);
		}
		setPermissionStatus(getLocationPermissionStatus());
		const coordinates = result?.coordinates;
		if (!coordinates) {
			// Refus définitif : le bouton disparaît, inutile d'alerter en plus.
			if (result?.status !== 'denied') {
				Alert.alert(
					'Position unavailable',
					'Check that the GPS is on and try again.'
				);
			}
			return;
		}
		// Valeur brute du GPS, sans arrondi : c'est elle qui part à la box.
		setValue('longitude', coordinates.longitude.toString(), {
			shouldDirty: true,
			shouldValidate: true
		});
		setValue('latitude', coordinates.latitude.toString(), {
			shouldDirty: true,
			shouldValidate: true
		});
	};

	const onSave = (data: any) => {
		// Double appui sur Save : une seule requête part vers la box.
		if (isSaving) return;
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setIsSaving(true);
		// `version` est une info descendante (version du backend) : on ne la
		// renvoie pas. Les autres settings éventuels sont conservés tels quels.
		const rest: any = {...settings};
		delete rest.version;
		props.saveSettings(
			{
				...rest,
				localCoordinates: {
					longitude: Number(data.longitude),
					latitude: Number(data.latitude)
				},
				modeRanks: toModeRanks(data.modeRanks)
			},
			() => {
				setIsSaving(false);
				leaveIntentRef.current = 'save';
				props.navigation.goBack();
			}
		);
	};

	const onCancel = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		leaveIntentRef.current = 'cancel';
		props.navigation.goBack();
	};

	const onBack = () => {
		leaveIntentRef.current = 'back';
		props.navigation.goBack();
	};

	// Entête conditionnelle, comme les autres écrans de settings : save/cancel
	// dès qu'un champ est modifié, simple retour sinon.
	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				isDirty
					? navigationHeader(onCancel, 'times-circle', false)
					: navigationHeader(onBack, 'arrow-alt-circle-left', false),
			headerRight: () =>
				isDirty
					? navigationHeader(handleSubmit(onSave), 'check-circle', false)
					: null
		});
	}, [isDirty, settings, isSaving]);

	// Sortie par geste/bouton matériel avec des modifications non sauvées :
	// confirmation avant abandon.
	useEffect(() => {
		const unsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				const intent = leaveIntentRef.current;
				leaveIntentRef.current = null;
				if (intent || !isDirty) return;
				e.preventDefault();
				Alert.alert(
					'Discard changes?',
					'You have unsaved changes. Would you like to continue editing or discard them?',
					[
						{text: 'Continue', style: 'cancel', onPress: () => {}},
						{
							text: 'Discard',
							style: 'destructive',
							onPress: () => props.navigation.dispatch(e.data.action)
						}
					]
				);
			}
		);
		return () => unsubscribe();
	}, [isDirty]);

	// Valeurs hors bornes : la section est signalée « not valid » même repliée.
	const locationInvalid = !!(errors.longitude || errors.latitude);

	return (
		<SettingsScrollView>
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key="location"
					name={'Local coordinates'}
					icon={faLocationDot}
					invalid={locationInvalid}
					defaultExpanded
					onPress={() => {}}>
					<View style={styles.section}>
						<View style={styles.row}>
							<Text style={styles.hintInline}>
								{permissionStatus === 'denied'
									? 'Location access refused'
									: 'Fill from the phone GPS'}
							</Text>
							{permissionStatus === 'denied' ? null : (
								<Pressable
									onPress={onRefreshCoordinates}
									disabled={isRefreshing}
									style={({pressed}) => [
										styles.refresh,
										{transform: [{scale: pressed ? 0.98 : 1}]}
									]}>
									{isRefreshing ? (
										<ActivityIndicator
											size="small"
											color={COLORS.text}
										/>
									) : (
										<FontAwesomeIcon
											icon={faSyncAlt}
											size={15}
											color={COLORS.text}
										/>
									)}
								</Pressable>
							)}
						</View>
						{permissionStatus === 'denied' ? (
							<Text
								style={styles.hint}
								onPress={() => Linking.openSettings()}>
								The coordinates can only be typed in. Tap here to
								open the system settings.
							</Text>
						) : null}
						<InputForm
							control={control}
							errors={errors}
							name="longitude"
							placeholder="Longitude*"
							keyboardType="numbers-and-punctuation"
							rules={{
								required: 'Longitude is required',
								validate: (value: any) => {
									const parsed = Number(value);
									if (value === '' || Number.isNaN(parsed))
										return 'Longitude must be a number';
									return (
										(parsed >= -180 && parsed <= 180) ||
										'Longitude must be between -180 and 180'
									);
								}
							}}
						/>
						<InputForm
							control={control}
							errors={errors}
							name="latitude"
							placeholder="Latitude*"
							keyboardType="numbers-and-punctuation"
							rules={{
								required: 'Latitude is required',
								validate: (value: any) => {
									const parsed = Number(value);
									if (value === '' || Number.isNaN(parsed))
										return 'Latitude must be a number';
									return (
										(parsed >= -90 && parsed <= 90) ||
										'Latitude must be between -90 and 90'
									);
								}
							}}
						/>
					</View>
				</MenuAccordion>
				<MenuAccordion
					key="priority"
					name={'Mode priority'}
					icon={faTrafficLight}
					invalid={!!errors.modeRanks}
					defaultExpanded
					onPress={() => {}}>
					<View style={styles.section}>
						<Text style={styles.hint}>
							Long press and drag a mode to change its priority.
						</Text>
						<DragableForm
							control={control}
							errors={errors}
							scrollEnabled={false}
							name="modeRanks"
							rules={{required: 'Mode priority is required'}}
						/>
					</View>
				</MenuAccordion>
				{settings?.version ? (
					<MenuAccordion
						key="box"
						name={'Box'}
						icon={faCircleInfo}
						onPress={() => {}}>
						<View style={[styles.section, styles.row]}>
							<Text style={styles.label}>Version</Text>
							<Text style={styles.value}>{settings.version}</Text>
						</View>
					</MenuAccordion>
				) : null}
			</MenuGroup>
		</SettingsScrollView>
	);
}

const COLORS = {
	text: '#32404e',
	hint: '#8a94a0',
	white: '#ffffff',
	shadow: '#000000'
};

const styles = StyleSheet.create({
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.white,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	section: {
		paddingHorizontal: 12,
		paddingVertical: 10
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	label: {
		fontWeight: 'bold',
		color: COLORS.text,
		fontSize: 15
	},
	value: {
		color: COLORS.hint,
		fontSize: 15
	},
	hint: {
		marginBottom: 8,
		color: COLORS.hint,
		fontSize: 12
	},
	hintInline: {
		flex: 1,
		color: COLORS.hint,
		fontSize: 12
	},
	refresh: {
		width: 35,
		height: 35,
		borderRadius: 0.5 * 45,
		justifyContent: 'center',
		alignItems: 'center',
		borderColor: COLORS.text,
		borderWidth: 2.5
	}
});

const mapStateToProps = (state: any) => ({
	settings: state.root_settings.settings
});

export default connect(mapStateToProps, {
	loadSettings,
	saveSettings
})(GlobalSettingsScreen);
