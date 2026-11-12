import {ELEMENT_HEIGHT, ELEMENT_FONT_SIZE} from '../../styles/metrics';
import React from 'react';
import {
	ActivityIndicator,
	Linking,
	Platform,
	StyleProp,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewStyle
} from 'react-native';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faExclamationCircle,
	faInfoCircle,
	faWifi
} from '@fortawesome/free-solid-svg-icons';
import i18n from 'i18next';

/**
 * Vocabulaire visuel commun aux écrans d'appairage (`scanBox`, `boxHandover`).
 *
 * Ces écrans enchaînent des états pleine page — « rejoignez ce réseau »,
 * « bascule en cours », « échec » — qui se ressemblent tous : une icône, un
 * titre, un paragraphe, un bouton, un lien. Les garder ici évite qu'ils
 * divergent au fil des ajouts.
 */
export const COLORS = {
	primary: '#32404e',
	accent: '#0082FC',
	danger: '#d64545',
	/** Fond et bordure de l'encadré d'erreur. */
	dangerSoft: '#fdecec',
	dangerBorder: '#f5c2c2',
	info: '#2c5282',
	/** Fond et bordure de l'encadré d'information. */
	infoSoft: '#ebf4ff',
	infoBorder: '#bee3f8',
	warning: '#dd6b20',
	/** Fond et bordure de l'encadré d'avertissement. */
	warningSoft: '#fff4e5',
	warningBorder: '#f6d3a8',
	success: '#2f9e44',
	light: '#ffffff',
	shadow: '#000000',
	viewfinder: '#000000',
	/** Voile d'attente posé sur l'écran. */
	scrim: 'rgba(0, 0, 0, 0.45)'
};

export const Centered = ({children}: {children: React.ReactNode}) => (
	<View style={accessStyles.centered}>{children}</View>
);

export const PrimaryButton = ({
	label,
	onPress,
	disabled = false
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
}) => (
	<TouchableOpacity
		style={[accessStyles.button, disabled ? accessStyles.buttonDisabled : null]}
		onPress={onPress}
		disabled={disabled}>
		<Text style={accessStyles.buttonText}>{label}</Text>
	</TouchableOpacity>
);

/**
 * Bouton contouré, même format que « Discover New Devices » du master : icône
 * (ou loader pendant l'appel) + libellé en gras. `color` teinte contour, icône
 * et libellé (ex. `COLORS.danger` pour une action destructive).
 */
export const OutlineButton = ({
	label,
	icon,
	busy = false,
	disabled = false,
	onPress,
	onLongPress,
	color = COLORS.primary,
	accessibilityLabel,
	style
}: {
	// Absent : bouton icône seule (donner alors `accessibilityLabel`).
	label?: string;
	icon: IconDefinition;
	busy?: boolean;
	disabled?: boolean;
	onPress?: () => void;
	onLongPress?: () => void;
	color?: string;
	accessibilityLabel?: string;
	style?: StyleProp<ViewStyle>;
}) => (
	<TouchableOpacity
		style={[
			accessStyles.outlineButton,
			{borderColor: color},
			(busy || disabled) && accessStyles.outlineButtonBusy,
			style
		]}
		disabled={busy || disabled}
		accessibilityRole="button"
		accessibilityLabel={accessibilityLabel ?? label}
		onPress={onPress}
		onLongPress={onLongPress}>
		{busy ? (
			<ActivityIndicator size="small" color={color} />
		) : (
			<FontAwesomeIcon icon={icon} size={16} color={color} />
		)}
		{label ? (
			<Text style={[accessStyles.outlineLabel, {color}]}>{label}</Text>
		) : null}
	</TouchableOpacity>
);

/**
 * Vrai tant que `until` (ms) n'est pas atteint ; repasse à faux tout seul à
 * l'échéance, sans attendre une autre mise à jour de l'écran.
 */
export const useLockedUntil = (until: number | null): boolean => {
	const [, setTick] = React.useState(0);
	const locked = until !== null && until > Date.now();
	React.useEffect(() => {
		if (until === null) return;
		const delay = until - Date.now();
		if (delay <= 0) return;
		const timer = setTimeout(() => setTick(n => n + 1), delay + 250);
		return () => clearTimeout(timer);
	}, [until]);
	return locked;
};

/**
 * Voile d'attente posé par-dessus l'écran, qui en bloque les appuis.
 *
 * Dessiné dans l'arbre de l'écran plutôt que dans un `Modal` natif, comme le
 * fait `react-native-loading-spinner-overlay` : un `Modal` retiré pendant que
 * l'app est en arrière-plan — téléphone verrouillé pendant un appairage — peut
 * rester affiché, invisible, au retour, et rendre tout l'écran inerte. Une
 * simple vue, elle, disparaît avec le rendu qui l'a produite.
 */
export const BusyOverlay = ({
	visible,
	message
}: {
	visible: boolean;
	message?: string;
}) =>
	visible ? (
		<View style={accessStyles.overlay} accessibilityViewIsModal>
			<ActivityIndicator size="large" color={COLORS.light} />
			{message ? (
				<Text style={accessStyles.overlayText}>{message}</Text>
			) : null}
		</View>
	) : null;

/**
 * Encadré d'erreur : icône et message sur fond rouge pâle, pour qu'un refus ne
 * passe pas pour une simple ligne de texte. `null` sans message — la place
 * n'est pas réservée.
 */
export const DangerBox = ({message}: {message?: string}) =>
	message ? (
		<View style={accessStyles.dangerBox} accessibilityRole="alert">
			<FontAwesomeIcon icon={faExclamationCircle} size={18} color={COLORS.danger} />
			<Text style={accessStyles.dangerText}>{message}</Text>
		</View>
	) : null;

/** Encadré d'information : icône et message sur fond bleu pâle. */
export const InfoBox = ({message}: {message: string}) => (
	<View style={accessStyles.infoBox}>
		<FontAwesomeIcon icon={faInfoCircle} size={18} color={COLORS.info} />
		<Text style={accessStyles.infoText}>{message}</Text>
	</View>
);

/**
 * Encadré d'avertissement, sans icône : le message seul sur fond orange pâle.
 * Pour les écrans dont le titre porte déjà l'icône. `null` sans message.
 */
export const WarningBox = ({message}: {message?: string}) =>
	message ? (
		<View style={accessStyles.warningBox} accessibilityRole="alert">
			<Text style={accessStyles.warningText}>{message}</Text>
		</View>
	) : null;

/** Encadré descriptif gris : partagé avec les autres écrans. */
export {DescBox} from '../../components/common/DescBox';

/** Action secondaire : même poids visuel qu'un lien, pas qu'un bouton. */
export const LinkButton = ({
	label,
	onPress
}: {
	label: string;
	onPress: () => void;
}) => (
	<TouchableOpacity onPress={onPress}>
		<Text style={accessStyles.link}>{label}</Text>
	</TouchableOpacity>
);

/**
 * Lien vers les réglages Wi-Fi du téléphone : icône Wi-Fi et couleur des
 * libellés, pour le distinguer des actions qui restent dans l'app.
 */
export const WifiSettingsLink = () => (
	<TouchableOpacity
		style={accessStyles.settingsLink}
		onPress={openWifiSettings}
		accessibilityRole="link">
		<FontAwesomeIcon icon={faWifi} size={14} color={COLORS.primary} />
		<Text style={accessStyles.settingsLinkText}>
			{i18n.t('access:openWifiSettings')}
		</Text>
	</TouchableOpacity>
);

/**
 * Ouvre la liste des réseaux Wi-Fi.
 *
 * `openSettings` n'ouvre sur Android que la fiche de l'application, ce qui ne
 * sert à rien quand on demande à l'utilisateur de changer de réseau — d'où
 * l'intent explicite, avec repli si l'appareil ne l'expose pas.
 */
export async function openWifiSettings(): Promise<void> {
	if (Platform.OS === 'android') {
		try {
			await Linking.sendIntent('android.settings.WIFI_SETTINGS');
			return;
		} catch {
			// Constructeur sans cette activité : les réglages de l'app valent
			// mieux que rien.
		}
	}
	Linking.openSettings();
}

// Feuille partagée : la règle ne voit pas les usages, qui sont dans les écrans
// qui l'importent.
/* eslint-disable react-native/no-unused-styles */
export const accessStyles = StyleSheet.create({
	outlineButton: {
		marginTop: 20,
		alignSelf: 'center',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		height: ELEMENT_HEIGHT,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: COLORS.primary
	},
	outlineButtonBusy: {
		opacity: 0.7
	},
	outlineLabel: {
		color: COLORS.primary,
		fontSize: ELEMENT_FONT_SIZE,
		fontWeight: 'bold'
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 30
	},
	title: {
		color: COLORS.primary,
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 15,
		textAlign: 'center'
	},
	body: {
		color: COLORS.primary,
		fontSize: 15,
		marginTop: 10,
		textAlign: 'center',
		lineHeight: 21
	},
	card: {
		backgroundColor: COLORS.light,
		borderRadius: 12,
		paddingVertical: 15,
		paddingHorizontal: 20,
		marginTop: 20,
		alignSelf: 'stretch',
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 2},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	cardLabel: {color: COLORS.primary, fontSize: 13, opacity: 0.6},
	cardValue: {
		color: COLORS.primary,
		fontSize: 17,
		fontWeight: 'bold',
		marginBottom: 10
	},
	link: {
		color: COLORS.accent,
		fontSize: 15,
		marginTop: 15,
		textDecorationLine: 'underline'
	},
	button: {
		backgroundColor: COLORS.primary,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 25,
		marginTop: 25
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 10,
		elevation: 10,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 30,
		backgroundColor: COLORS.scrim
	},
	overlayText: {
		color: COLORS.light,
		fontSize: 15,
		marginTop: 15,
		textAlign: 'center'
	},
	dangerBox: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'stretch',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.dangerBorder,
		backgroundColor: COLORS.dangerSoft
	},
	dangerText: {
		flex: 1,
		color: COLORS.danger,
		fontSize: 14,
		lineHeight: 19
	},
	infoBox: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'stretch',
		gap: 10,
		marginTop: 14,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.infoBorder,
		backgroundColor: COLORS.infoSoft
	},
	infoText: {
		flex: 1,
		color: COLORS.info,
		fontSize: 14,
		lineHeight: 19
	},
	warningBox: {
		alignSelf: 'stretch',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.warningBorder,
		backgroundColor: COLORS.warningSoft
	},
	warningText: {
		color: COLORS.warning,
		fontSize: 14,
		lineHeight: 19,
		textAlign: 'center'
	},
	settingsLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 15,
		paddingVertical: 4
	},
	settingsLinkText: {
		color: COLORS.primary,
		fontSize: 15,
		fontWeight: 'bold'
	},
	buttonDisabled: {opacity: 0.5},
	buttonText: {color: COLORS.light, fontSize: 15, fontWeight: 'bold'}
});
