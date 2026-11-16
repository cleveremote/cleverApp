import React, {useEffect, useMemo, useState} from 'react';
import {FlatList, Platform, Text, View} from 'react-native';
import {connect, useSelector} from 'react-redux';
import Spinner from 'react-native-loading-spinner-overlay';
import {
	loadEvents,
	loadValues
} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {styles} from '../../../styles/cycleStyles';
import {DateTimePickerForm} from '../../../components/common/FormComponents';
import {TimeZoneNotice} from '../../../components/common/TimeZoneNotice';
import {startOfDayIn} from '../../../../services/time';
import {selectBoxTimeZone} from '../../../../module/process/infrasctructure/store/models/boxSettings';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useTranslation} from 'react-i18next';
import {RunCard} from '../../../components/cycle/RunCard';
import {CycleRun} from '../../../../module/process/infrasctructure/store/models/cycleHistory';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

const hapticTriggerType: string = Platform.select({
	ios: 'notificationSuccess',
	android: 'impactMedium'
}) as string;

function EventsScreen(props: any) {
	const {t} = useTranslation('cycle');
	// Dates saisies et affichées en heure de la box, comme ses crons.
	const tz: string = useSelector(selectBoxTimeZone);
	const startOfToday = () => new Date(startOfDayIn(tz));
	const defaultValues = {startDate: startOfToday(), endDate: new Date()};
	const [maximumDate, setMaximumDate] = useState(new Date());
	const [minimumDate, setMinimumDate] = useState(startOfToday());

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue,
		register
	} = useForm({defaultValues});

	const [expandedId, setExpandedId] = useState<string | null>(null);

	// Requête des événements exclue du loader global : loader propre à
	// l'écran, levé à la réponse (ou au bout de 15 s sans réponse).
	const [loading, setLoading] = useState(false);
	const requestRef = React.useRef(0);
	const onSubmit = (data: any) => {
		const request = ++requestRef.current;
		const done = () => {
			if (requestRef.current === request) setLoading(false);
		};
		setLoading(true);
		setTimeout(done, 15000);
		props.loadEvents(
			{
				deviceId: props.route.params.cycle.id,
				startDate: data.startDate,
				endDate: data.endDate
			},
			done
		);
	};

	const [refreshing, setRefreshing] = useState<boolean>(false);
	const onRefresh = async () => {
		setRefreshing(true);
		handleSubmit(onSubmit)();
		setRefreshing(false);
	};
	useEffect(() => {}, [props.events]);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.goBack();
					},
					'arrow-alt-circle-left',
					false
				)
		});
		handleSubmit(onSubmit)();
	}, []);

	const runs: CycleRun[] = useMemo(() => props.events ?? [], [props.events]);
	const cycle = props.route.params.cycle;

	// Noms des cycles/séquences : timeline des runs, séquences du cycle, puis
	// liste des cycles ; à défaut l'id.
	const nameOf = useMemo(() => {
		const names: Record<string, string> = {};
		(props.cycles || []).forEach((c: any) => {
			if (c?.id && c.name) names[c.id] = c.name;
		});
		(cycle?.sequences || []).forEach((sq: any) => {
			if (sq?.id && sq.name) names[sq.id] = sq.name;
		});
		if (cycle?.id && cycle.name) names[cycle.id] = cycle.name;
		runs.forEach(run =>
			(run.timeline || []).forEach(t => {
				if (t.elementId && t.name) names[t.elementId] = t.name;
			})
		);
		return (id: string) => names[id] || id;
	}, [runs, props.cycles, cycle]);

	const renderItem = ({item}: {item: CycleRun}) => {
		const key = 'run_' + item.runId;
		const expanded = expandedId === key;
		return (
			<RunCard
				run={item}
				expanded={expanded}
				onToggle={() => setExpandedId(expanded ? null : key)}
				nameOf={nameOf}
			/>
		);
	};

	return (
		<View style={{gap: 8, marginVertical: 4, alignSelf: 'stretch'}}>
			<View style={BoxFormStyle.boxForm}>
				<TimeZoneNotice kind="box" />
				<DateTimePickerForm
					mode={'datetime'}
					timeZone={tz}
					control={control}
					errors={errors}
					name="startDate"
					placeholder={t('events.from')}
					rules={{required: t('events.startRequired')}}
					maximumDate={maximumDate}
					onChangeText={(value: any) => {
						const now = new Date();
						setMaximumDate(now);
						setMinimumDate(value);
						setTimeout(() => {
							handleSubmit(onSubmit)();
						}, 200);
					}}
				/>
				<DateTimePickerForm
					mode={'datetime'}
					timeZone={tz}
					control={control}
					errors={errors}
					name="endDate"
					placeholder={t('events.to')}
					rules={{required: t('events.endRequired')}}
					minimumDate={minimumDate}
					maximumDate={maximumDate}
					onChangeText={(value: any) => {
						setTimeout(() => {
							handleSubmit(onSubmit)();
						}, 200);
					}}
				/>
			</View>
			<Spinner
				visible={props.isLoading || loading}
				color="#32404e"
				textStyle={styles.spinnerTextStyle}
				animation="fade"
			/>
			<FlatList
				data={runs}
				renderItem={renderItem}
				keyExtractor={item => 'run_' + item.runId}
				extraData={expandedId}
				onRefresh={() => onRefresh()}
				refreshing={refreshing}
				ListEmptyComponent={
					props.isLoading ? null : (
						<Text
							style={{
								color: '#777',
								textAlign: 'center',
								marginTop: 24
							}}>
							{t('events.noRun')}
						</Text>
					)
				}
			/>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	data: state.root_cycle.data,
	events: state.root_cycle.events,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {
	loadValues,
	loadEvents
})(EventsScreen);
