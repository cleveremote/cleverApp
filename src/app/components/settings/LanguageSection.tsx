import React, {useEffect, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCheck, faLanguage} from '@fortawesome/free-solid-svg-icons';
import {MenuAccordion} from '../common/cycleMenu';
import {hapticOptions} from '../../data/cycleTypes';
import {
	changeLanguage,
	getLanguagePreference,
	Language,
	LanguagePreference,
	needsRestart,
	resolveLanguage
} from '../../../i18n';

// Chaque langue est présentée dans sa propre langue, pour qu'on la retrouve
// même si l'interface est dans une langue qu'on ne lit pas.
const OPTIONS: {value: LanguagePreference; label?: string}[] = [
	{value: 'system'},
	{value: 'fr', label: 'Français'},
	{value: 'en', label: 'English'},
	{value: 'ar', label: 'العربية'}
];

/**
 * Langue de l'application : préférence du téléphone, enregistrée sur
 * l'appareil et appliquée immédiatement. `onChange` reçoit la langue effective
 * ('system' résolu) pour la transmettre à la box ; quand le changement impose
 * un redémarrage, on attend sa promesse pour que l'envoi ne soit pas perdu.
 */
export function LanguageSection({
	onChange
}: {
	onChange?: (lng: Language) => Promise<void> | void;
}) {
	const {t} = useTranslation(['settings', 'common']);
	const [current, setCurrent] = useState<LanguagePreference>('system');

	useEffect(() => {
		getLanguagePreference().then(setCurrent);
	}, []);

	const select = (value: LanguagePreference) => {
		if (value === current) return;
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		// Passer à l'arabe (ou en sortir) inverse le sens de l'interface, ce
		// que React Native n'applique qu'au redémarrage.
		const restart = needsRestart(value);
		const apply = async () => {
			setCurrent(value);
			const sent = onChange?.(resolveLanguage(value));
			if (restart) await sent;
			changeLanguage(value);
		};
		if (restart) {
			Alert.alert(t('language.restartTitle'), t('language.restartMessage'), [
				{text: t('common:cancel'), style: 'cancel'},
				{text: t('language.restart'), onPress: apply}
			]);
		} else {
			apply();
		}
	};

	return (
		<MenuAccordion
			name={t('language.title')}
			icon={faLanguage}
			onPress={() => {}}>
			<View style={styles.section}>
				{OPTIONS.map(option => (
					<Pressable
						key={option.value}
						style={styles.row}
						onPress={() => select(option.value)}>
						<Text style={styles.label}>
							{option.label ?? t('language.system')}
						</Text>
						{current === option.value ? (
							<FontAwesomeIcon icon={faCheck} color={COLORS.text} />
						) : null}
					</Pressable>
				))}
			</View>
		</MenuAccordion>
	);
}

const COLORS = {
	text: '#32404e'
};

const styles = StyleSheet.create({
	section: {
		paddingHorizontal: 12,
		paddingVertical: 4
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10
	},
	label: {
		color: COLORS.text,
		fontSize: 15
	}
});
