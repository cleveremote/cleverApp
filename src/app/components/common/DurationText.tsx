import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { durationParts } from '../../../services/time';
import { fieldLabelText } from '../../styles/components/common/Input';

/**
 * Durée affichée « 01 h : 00 min » : les chiffres prennent le style du champ,
 * les unités (traduites, common:durationUnit) ont le style des libellés de
 * l'application.
 */
export function DurationText({
	ms,
	style
}: Readonly<{
	ms?: number | null;
	style?: StyleProp<TextStyle>;
}>) {
	const { t } = useTranslation('common');
	const { hours, minutes } = durationParts(ms);
	return (
		<Text style={style}>
			{hours}
			<Text style={styles.unit}>{` ${t('durationUnit.hours')}`}</Text>
			{` : ${minutes}`}
			<Text style={styles.unit}>{` ${t('durationUnit.minutes')}`}</Text>
		</Text>
	);
}

const styles = StyleSheet.create({
	unit: {
		// Même style que les libellés de l'application.
		...fieldLabelText
	}
});
