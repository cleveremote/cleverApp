import React, {useEffect, useRef, useState} from 'react';
import {
	ActivityIndicator,
	Alert,
	Linking,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faSyncAlt} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {InputForm} from '../../components/common/FormComponents';
import {BoxFormStyle} from '../../styles/components/common/boxForm';
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

// Global settings area: for now it only exposes the box `localCoordinates`
// (longitude / latitude), fetched from the backend (front/box/fetch/settings)
// and persisted with the header Save button (front/box/sync/settings).
// The refresh button only *prefills* the two fields with the phone GPS
// position — nothing is sent to the box until Save.
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
		defaultValues: {
			longitude: settings?.localCoordinates?.longitude?.toString() ?? '',
			latitude: settings?.localCoordinates?.latitude?.toString() ?? ''
		},
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
		reset({
			longitude: settings?.localCoordinates?.longitude?.toString() ?? '',
			latitude: settings?.localCoordinates?.latitude?.toString() ?? ''
		});
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
				}
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

	return (
		<ScrollView automaticallyAdjustKeyboardInsets={true}>
			<View style={styles.header}>
				<Text style={styles.headerLabel}>Local coordinates</Text>
				{permissionStatus === 'denied' ? null : (
					<Pressable
						onPress={onRefreshCoordinates}
						disabled={isRefreshing}
						style={({pressed}) => [
							styles.refresh,
							{transform: [{scale: pressed ? 0.98 : 1}]}
						]}>
						{isRefreshing ? (
							<ActivityIndicator size="small" color={COLORS.text} />
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
					Location access refused — the coordinates can only be typed
					in. Tap here to open the system settings.
				</Text>
			) : null}
			<View style={BoxFormStyle.boxForm}>
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
			{settings?.version ? (
				<View style={styles.header}>
					<Text style={styles.headerLabel}>Box version</Text>
					<Text style={styles.value}>{settings.version}</Text>
				</View>
			) : null}
		</ScrollView>
	);
}

const COLORS = {
	text: '#32404e',
	hint: '#8a94a0'
};

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 12,
		marginHorizontal: 30
	},
	headerLabel: {
		fontWeight: 'bold',
		color: COLORS.text,
		fontSize: 15
	},
	value: {
		color: COLORS.hint,
		fontSize: 15
	},
	hint: {
		marginTop: 8,
		marginHorizontal: 30,
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
