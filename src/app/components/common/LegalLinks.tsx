import React from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {PRIVACY_POLICY_URL, SUPPORT_URL} from '../../../../config/env';

// Opens an external page (privacy policy, support) in the system browser.
export const openExternalUrl = (url: string) => {
	Linking.openURL(url).catch(error =>
		console.error('Unable to open URL:', url, error)
	);
};

// "Privacy policy · Support" links, URLs come from .env (PRIVACY_POLICY_URL,
// SUPPORT_URL).
export function LegalLinks() {
	const {t} = useTranslation('common');
	return (
		<View style={styles.row}>
			<TouchableOpacity
				accessibilityRole="link"
				onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}>
				<Text style={styles.link}>{t('privacyPolicy')}</Text>
			</TouchableOpacity>
			<Text style={styles.separator}>·</Text>
			<TouchableOpacity
				accessibilityRole="link"
				onPress={() => openExternalUrl(SUPPORT_URL)}>
				<Text style={styles.link}>{t('support')}</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8
	},
	link: {
		color: '#32404e',
		fontSize: 13,
		textDecorationLine: 'underline'
	},
	separator: {
		color: '#32404e',
		fontSize: 13
	}
});
