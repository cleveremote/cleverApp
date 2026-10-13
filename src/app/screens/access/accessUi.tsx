import React from 'react';
import {
	Linking,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';

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
