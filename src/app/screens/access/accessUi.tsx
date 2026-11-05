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
	success: '#2f9e44',
	light: '#ffffff',
	shadow: '#000000',
	viewfinder: '#000000'
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
 * (ou loader pendant l'appel) + libellé en gras.
 */
export const OutlineButton = ({
	label,
	icon,
	busy = false,
	disabled = false,
	onPress,
	style
}: {
	label: string;
	icon: IconDefinition;
	busy?: boolean;
	disabled?: boolean;
	onPress: () => void;
	style?: StyleProp<ViewStyle>;
}) => (
	<TouchableOpacity
		style={[
			accessStyles.outlineButton,
			(busy || disabled) && accessStyles.outlineButtonBusy,
			style
		]}
		disabled={busy || disabled}
		onPress={onPress}>
		{busy ? (
			<ActivityIndicator size="small" color={COLORS.primary} />
		) : (
			<FontAwesomeIcon icon={icon} size={16} color={COLORS.primary} />
		)}
		<Text style={accessStyles.outlineLabel}>{label}</Text>
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
		paddingVertical: 8,
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
		fontSize: 15,
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
	buttonDisabled: {opacity: 0.5},
	buttonText: {color: COLORS.light, fontSize: 15, fontWeight: 'bold'}
});
