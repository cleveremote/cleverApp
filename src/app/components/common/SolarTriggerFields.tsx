import {inputText} from '../../styles/components/common/Input';
import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {pickerLocaleProps} from './pickerLocale';
import i18n from 'i18next';
import {
	durationToPickerDate,
	pickerDateToDuration
} from '../../../services/time';

export type SunState = 'SUNRISE' | 'SUNSET';
export type TimeDirection = 'BEFORE' | 'AFTER';

export interface SolarTriggerValue {
	sunState: SunState;
	timeDirection: TimeDirection;
	time: number; // décalage en ms
}

const C = {
	accent: '#32404e',
	surface: '#ffffff',
	onAccent: '#ffffff',
	border: '#CBD5E0',
	muted: '#718096',
	text: '#32404e'
};

/**
 * Champs du déclencheur solaire : avant/après, lever/coucher et décalage.
 * Partagé entre la planification (schedule) et l'exécution des triggers.
 */
export function SolarTriggerFields({
	value,
	onChange
}: {
	value: SolarTriggerValue;
	onChange: (patch: Partial<SolarTriggerValue>) => void;
}) {
	const [offsetPickerVisible, setOffsetPickerVisible] = React.useState(false);
	const totalMin = Math.round((value.time || 0) / 60000);
	const offsetH = Math.floor(totalMin / 60);
	const offsetM = totalMin % 60;

	return (
		<>
			{/* timeDirection (avant/après) — placé avant le choix lever/coucher. */}
			<View style={styles.segRow}>
				<SegBtn
					label={i18n.t('cycle:cron.solar.before')}
					active={value.timeDirection === 'BEFORE'}
					onPress={() => onChange({timeDirection: 'BEFORE'})}
				/>
				<SegBtn
					label={i18n.t('cycle:cron.solar.after')}
					active={value.timeDirection === 'AFTER'}
					onPress={() => onChange({timeDirection: 'AFTER'})}
				/>
			</View>
			<View style={styles.segRow}>
				<SegBtn
					label={i18n.t('cycle:cron.solar.sunrise')}
					active={value.sunState === 'SUNRISE'}
					onPress={() => onChange({sunState: 'SUNRISE'})}
				/>
				<SegBtn
					label={i18n.t('cycle:cron.solar.sunset')}
					active={value.sunState === 'SUNSET'}
					onPress={() => onChange({sunState: 'SUNSET'})}
				/>
			</View>
			<Text style={styles.fieldLabel}>{i18n.t('cycle:cron.solar.offset')}</Text>
			<TouchableOpacity
				onPress={() => setOffsetPickerVisible(true)}
				style={styles.dateField}>
				<Text style={styles.dateFieldTxt}>
					{String(offsetH).padStart(2, '0')}:
					{String(offsetM).padStart(2, '0')}
				</Text>
			</TouchableOpacity>

			{/* Décalage solaire : même roue que « Disable trigger for » des triggers. */}
			<DateTimePickerModal
				isVisible={offsetPickerVisible}
				mode="time"
				display="spinner"
				pickerStyleIOS={{alignItems: 'center'}}
				themeVariant="light"
				isDarkModeEnabled={false}
				accentColor={C.accent}
				buttonTextColorIOS={C.accent}
				date={durationToPickerDate(value.time || 0)}
				onConfirm={d => {
					setOffsetPickerVisible(false);
					onChange({time: pickerDateToDuration(d)});
				}}
				onCancel={() => setOffsetPickerVisible(false)}
				{...pickerLocaleProps('time')}
			/>
		</>
	);
}

function SegBtn({
	label,
	active,
	onPress
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[styles.segBtn, active && styles.segBtnActive]}>
			<Text style={[styles.segTxt, active && styles.segTxtActive]}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	fieldLabel: {fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: '600'},
	dateField: {
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		height: ELEMENT_HEIGHT,
		justifyContent: 'center'
	},
	dateFieldTxt: inputText,
	segRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
	segBtn: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 6,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		alignItems: 'center'
	},
	segBtnActive: {backgroundColor: C.accent, borderColor: C.accent},
	segTxt: {fontSize: 13, color: C.text, textAlign: 'center', fontWeight: '600'},
	segTxtActive: {color: C.onAccent, fontWeight: '700'}
});
