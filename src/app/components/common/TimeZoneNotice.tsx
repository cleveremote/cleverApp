import React from 'react';
import {StyleProp, StyleSheet, Text, ViewStyle} from 'react-native';
import {useSelector} from 'react-redux';
import i18n from 'i18next';
import {deviceTimeZone, wallClockIn} from '../../../services/time';
import {selectBoxTimeZone} from '../../../module/process/infrasctructure/store/models/boxSettings';
import {WARNING_COLORS, WarningBox} from './WarningBox';

/**
 * Bandeau « attention » placé près d'une date saisie ou affichée : précise
 * si elle est en heure de la box (`settings.timeZone`, celle des crons) ou en
 * heure locale du téléphone, et signale l'autre fuseau. Masqué quand box et
 * téléphone sont à la même heure : rien à signaler.
 */
export function TimeZoneNotice({
	kind,
	style
}: Readonly<{
	kind: 'box' | 'local';
	style?: StyleProp<ViewStyle>;
}>) {
	const boxTz: string = useSelector(selectBoxTimeZone);
	const phoneTz = deviceTimeZone();
	if (sameWallClock(boxTz, phoneTz)) {
		return null;
	}
	const [shown, other] = kind === 'box' ? [boxTz, phoneTz] : [phoneTz, boxTz];
	return (
		<WarningBox style={style}>
			<Text style={styles.title}>
				{i18n.t(`common:timeZoneNotice.${kind}` as never, {
					timeZone: shown
				})}
			</Text>
			<Text style={styles.text}>
				{i18n.t(
					(kind === 'box'
						? 'common:timeZoneNotice.localDiffers'
						: 'common:timeZoneNotice.boxDiffers') as never,
					{timeZone: other}
				)}
			</Text>
		</WarningBox>
	);
}

/**
 * Même heure murale en ce moment dans les deux fuseaux. Compare l'heure et
 * non le nom : « Europe/Paris » et « Europe/Brussels » ne justifient pas
 * d'alerte.
 */
const sameWallClock = (a: string, b: string): boolean => {
	if (a === b) {
		return true;
	}
	try {
		const now = Date.now();
		const wa = wallClockIn(a, now);
		const wb = wallClockIn(b, now);
		return (
			wa.day === wb.day && wa.hour === wb.hour && wa.minute === wb.minute
		);
	} catch {
		// Fuseau inconnu du moteur JS : on garde l'alerte.
		return false;
	}
};

const styles = StyleSheet.create({
	title: {fontSize: 13, fontWeight: '600', color: WARNING_COLORS.text},
	text: {fontSize: 12, color: WARNING_COLORS.text, marginTop: 2}
});
