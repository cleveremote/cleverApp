import React, {useState} from 'react';
import i18n from 'i18next';
import {Control, useController} from 'react-hook-form';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {InputStyle, placeholderColor} from '../../styles/components/common/Input';
import {endOfDayIn, wallClockIn, zonedToEpoch} from '../../../services/time';

const ACCENT = '#32404e';
const RANGE = '#D6DEE8';
const BORDER = '#CBD5E0';
const DIVIDER = '#D5D5D5';
const BACKDROP = 'rgba(0,0,0,0.4)';
const SURFACE = 'white';
const PRESSED = '#EBEBEB';

const noop = () => undefined;

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

// Jour 'YYYY-MM-DD' d'un instant dans le fuseau, format des clés du calendrier.
const dayKey = (timeZone: string, date: Date | number) => {
	const w = wallClockIn(timeZone, date);
	return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
};

const dayStart = (timeZone: string, key: string) => {
	const [year, month, day] = key.split('-').map(Number);
	return zonedToEpoch(timeZone, {year, month, day, hour: 0, minute: 0});
};

const dayEnd = (timeZone: string, key: string) =>
	endOfDayIn(timeZone, dayStart(timeZone, key));

// Jours consécutifs de `from` à `to` inclus (clés UTC, sans effet de fuseau).
const daysBetween = (from: string, to: string) => {
	const days: string[] = [];
	for (
		let d = new Date(`${from}T00:00:00Z`);
		d <= new Date(`${to}T00:00:00Z`);
		d.setUTCDate(d.getUTCDate() + 1)
	) {
		days.push(d.toISOString().slice(0, 10));
	}
	return days;
};

// Noms de mois/jours du calendrier dans la langue de l'app, via Intl.
const applyCalendarLocale = (lang: string) => {
	if (!LocaleConfig.locales[lang]) {
		const month = (opt: 'long' | 'short') =>
			Array.from({length: 12}, (_, m) =>
				new Intl.DateTimeFormat(lang, {month: opt, timeZone: 'UTC'}).format(
					Date.UTC(2024, m, 1)
				)
			);
		// 2024-01-07 est un dimanche : index 0 = dimanche, comme la lib.
		const weekday = (opt: 'long' | 'short') =>
			Array.from({length: 7}, (_, d) =>
				new Intl.DateTimeFormat(lang, {weekday: opt, timeZone: 'UTC'}).format(
					Date.UTC(2024, 0, 7 + d)
				)
			);
		LocaleConfig.locales[lang] = {
			monthNames: month('long'),
			monthNamesShort: month('short'),
			dayNames: weekday('long'),
			dayNamesShort: weekday('short')
		};
	}
	LocaleConfig.defaultLocale = lang;
};

/**
 * Période « du … au … » choisie en un seul calendrier, au jour près dans
 * `timeZone` : le début vaut 00:00 du premier jour, la fin 23:59:59 du
 * dernier jour (même aujourd'hui, pour inclure les événements à venir dans la
 * journée). `maximumDate` borne les jours sélectionnables. Les deux champs
 * restent des instants.
 */
export function DateRangePickerForm({
	control,
	placeholder,
	startName,
	endName,
	timeZone,
	maximumDate = new Date(),
	onChange = noop,
	renderTrigger
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	startName: string;
	endName: string;
	timeZone: string;
	maximumDate?: Date;
	onChange?: (range: {startDate: Date; endDate: Date}) => void;
	// Remplace le libellé et le champ d'ouverture (ex. PillButton).
	renderTrigger?: (label: string, open: () => void) => React.ReactNode;
}>) {
	const start = useController({control, name: startName});
	const end = useController({control, name: endName});
	const [visible, setVisible] = useState(false);
	const insets = useSafeAreaInsets();
	const [draft, setDraft] = useState<{from?: string; to?: string}>({});

	const maxDay = dayKey(timeZone, maximumDate);

	const open = () => {
		applyCalendarLocale(i18n.language);
		setDraft({
			from: start.field.value ? dayKey(timeZone, start.field.value) : undefined,
			to: end.field.value ? dayKey(timeZone, end.field.value) : undefined
		});
		setVisible(true);
	};

	// 1er appui : début ; 2e : fin (ou nouveau début s'il est avant) ; un
	// appui sur une période complète en recommence une.
	const onDayPress = ({dateString}: {dateString: string}) =>
		setDraft(d =>
			!d.from || d.to || dateString < d.from
				? {from: dateString}
				: {from: d.from, to: dateString}
		);

	const confirm = () => {
		if (!draft.from) return;
		const startDate = new Date(dayStart(timeZone, draft.from));
		const endDate = new Date(dayEnd(timeZone, draft.to ?? draft.from));
		start.field.onChange(startDate);
		end.field.onChange(endDate);
		setVisible(false);
		onChange({startDate, endDate});
	};

	const markedDates = draft.from
		? Object.fromEntries(
				daysBetween(draft.from, draft.to ?? draft.from).map((day, i, all) => [
					day,
					{
						startingDay: i === 0,
						endingDay: i === all.length - 1,
						color: i === 0 || i === all.length - 1 ? ACCENT : RANGE,
						textColor: i === 0 || i === all.length - 1 ? 'white' : ACCENT
					}
				])
		  )
		: {};

	const dayFormat = new Intl.DateTimeFormat(i18n.language, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone
	});
	const label =
		start.field.value && end.field.value
			? i18n.t('common:dateRange', {
					from: dayFormat.format(start.field.value),
					to: dayFormat.format(end.field.value)
			  })
			: '';

	return (
		<View>
			{renderTrigger ? (
				renderTrigger(label, open)
			) : (
				<>
					<Text style={InputStyle.textInput}>{placeholder}</Text>
					<Pressable onPress={open}>
						<TextInput
							style={[InputStyle.input, localStyles.field]}
							placeholder={placeholder}
							placeholderTextColor={placeholderColor}
							editable={false}
							value={label}
							pointerEvents="none"
						/>
					</Pressable>
				</>
			)}
			<Modal
				visible={visible}
				transparent
				animationType="fade"
				onRequestClose={() => setVisible(false)}>
				{/* Feuille du bas comme le picker de date : calendrier + Confirmer
				    dans une carte, Annuler dans une carte séparée. */}
				<Pressable
					style={[localStyles.backdrop, {paddingBottom: insets.bottom + 10}]}
					onPress={() => setVisible(false)}>
					<Pressable style={localStyles.card}>
						<Calendar
							key={i18n.language}
							current={draft.from ?? maxDay}
							maxDate={maxDay}
							firstDay={1}
							markingType="period"
							markedDates={markedDates}
							onDayPress={onDayPress}
							enableSwipeMonths
							style={localStyles.calendar}
							theme={{
								arrowColor: ACCENT,
								todayTextColor: ACCENT,
								monthTextColor: ACCENT,
								textMonthFontWeight: 'bold'
							}}
						/>
						<Pressable
							onPress={confirm}
							disabled={!draft.from}
							style={({pressed}) => [
								localStyles.button,
								localStyles.confirm,
								pressed && localStyles.pressed
							]}>
							<Text style={[localStyles.confirmText, !draft.from && localStyles.disabled]}>
								{i18n.t('common:confirmChoice')}
							</Text>
						</Pressable>
					</Pressable>
					<Pressable
						onPress={() => setVisible(false)}
						style={({pressed}) => [
							localStyles.card,
							localStyles.button,
							pressed && localStyles.pressed
						]}>
						<Text style={localStyles.cancelText}>{i18n.t('common:cancel')}</Text>
					</Pressable>
				</Pressable>
			</Modal>
		</View>
	);
}

const localStyles = StyleSheet.create({
	field: {
		borderRadius: 12,
		borderWidth: 1,
		borderColor: BORDER,
		paddingHorizontal: 12
	},
	backdrop: {
		flex: 1,
		justifyContent: 'flex-end',
		paddingHorizontal: 10,
		backgroundColor: BACKDROP
	},
	card: {
		backgroundColor: SURFACE,
		borderRadius: 13,
		marginBottom: 8,
		overflow: 'hidden'
	},
	calendar: {paddingBottom: 8},
	button: {
		height: 57,
		justifyContent: 'center',
		alignItems: 'center'
	},
	confirm: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: DIVIDER
	},
	pressed: {backgroundColor: PRESSED},
	confirmText: {color: ACCENT, fontSize: 20},
	cancelText: {color: ACCENT, fontSize: 20, fontWeight: '600'},
	disabled: {opacity: 0.4}
});
