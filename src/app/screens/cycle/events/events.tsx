import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, Platform, Text, TouchableOpacity, View} from 'react-native';
import {connect} from 'react-redux';
import Spinner from 'react-native-loading-spinner-overlay';
import {
	loadEvents,
	loadValues
} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {styles} from '../../../styles/cycleStyles';
import {DateTimePickerForm} from '../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useTranslation} from 'react-i18next';
import {
	formatDateTime,
	RunCard
} from '../../../components/cycle/RunCard';
import {
	CycleHistory,
	CycleRun
} from '../../../../module/process/infrasctructure/store/models/cycleHistory';

type Row =
	| {key: string; type: 'run'; run: CycleRun}
	| {key: string; type: 'legacyHeader'}
	| {key: string; type: 'legacy'; event: any};

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
	const getTimeString = (dateValue: number) => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return new Date(date.getTime() + dateValue);
	};
	const defaultValues = {startDate: getTimeString(0), endDate: new Date()};
	const [maximumDate, setMaximumDate] = useState(new Date());
	const [minimumDate, setMinimumDate] = useState(getTimeString(0));

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue,
		register
	} = useForm({defaultValues});

	const [expandedId, setExpandedId] = useState<string | null>(null);

	const onSubmit = (data: any) => {
		props.loadEvents({
			deviceId: props.route.params.cycle.id,
			startDate: data.startDate,
			endDate: data.endDate
		});
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

	const renderLegacy = useCallback(
		(item: any) => {
			const additionalData = item.additionalData || {};
			const causes: {type: string; cause: string}[] =
				additionalData.causes || [];
			const isExpanded = expandedId === item.id;
			const hasCauses = causes.length > 0;

			// Extra fields shown only when the row is expanded.
			const details = [
				{label: t('events.type'), value: additionalData.type},
				{label: t('events.status'), value: additionalData.status},
				{
					label: t('events.startedAt'),
					value: additionalData.startedAt
						? formatDateTime(additionalData.startedAt)
						: undefined
				},
				{
					label: t('events.duration'),
					value:
						additionalData.duration !== undefined
							? String(additionalData.duration)
							: undefined
				},
				{label: t('events.element'), value: item.elementType},
				{
					label: t('run.confirmation'),
					value: additionalData.confirmation?.isRequested
						? t('events.requested')
						: undefined
				},
				...(additionalData.confirmation?.conflicts || []).map(
					(c: any) => ({
						label: t('events.conflict'),
						value:
							`${c.name} (${c.mode}) : ` +
							(c.isWinning ? t('events.willBeStopped') : t('events.lost'))
					})
				)
			].filter(d => d.value !== undefined && d.value !== null);

			const isExpandable = hasCauses || details.length > 0;

			return (
				<View key={item.id} style={{marginVertical: 4}}>
					<TouchableOpacity
						activeOpacity={isExpandable ? 0.7 : 1}
						onPress={() =>
							isExpandable &&
							setExpandedId(isExpanded ? null : item.id)
						}
						style={{
							alignSelf: 'stretch',
							backgroundColor: 'white',
							borderRadius: 12,
							elevation: 3,
							shadowColor: '#000',
							shadowOffset: {width: 0, height: 1},
							shadowOpacity: 0.22,
							shadowRadius: 2.22,
							minHeight: 45,
							paddingVertical: 6,
							marginHorizontal: 4
						}}>
						<View
							style={{
								flexDirection: 'row',
								marginTop: 4,
								marginHorizontal: 8,
								alignItems: 'center'
							}}>
							{/* Orange dot when the event has causes */}
							{hasCauses ? (
								<View
									style={{
										width: 10,
										height: 10,
										borderRadius: 5,
										backgroundColor: '#FF9500',
										marginLeft: 8
									}}
								/>
							) : null}
							<Text
								style={{
									flex: 1,
									marginLeft: 8,
									color: '#444',
									fontSize: 14
								}}
								numberOfLines={1}
								ellipsizeMode="middle">
								{formatDateTime(item.date)}
							</Text>
							<Text
								style={{
									marginHorizontal: 8,
									fontWeight: 'bold',
									color: 'black',
									fontSize: 15
								}}
								numberOfLines={1}
								ellipsizeMode="middle">
								{additionalData.value}
							</Text>
							{isExpandable ? (
								<Text
									style={{
										marginRight: 8,
										color: '#32404e',
										fontSize: 12
									}}>
									{isExpanded ? '▲' : '▼'}
								</Text>
							) : null}
						</View>
						{isExpanded && isExpandable ? (
							<View
								style={{
									marginTop: 6,
									marginHorizontal: 16,
									borderTopWidth: 1,
									borderTopColor: '#eee',
									paddingTop: 6
								}}>
								{details.map((d, index) => (
									<Text
										key={'d' + index}
										style={{
											color: '#555',
											fontSize: 13,
											marginBottom: 2
										}}>
										{d.label} : {d.value}
									</Text>
								))}
								{hasCauses ? (
									<Text
										style={{
											color: '#FF9500',
											fontSize: 13,
											fontWeight: 'bold',
											marginTop: 4,
											marginBottom: 2
										}}>
										{t('events.causes')}
									</Text>
								) : null}
								{causes.map((c, index) => (
									<Text
										key={'c' + index}
										style={{
											color: '#555',
											fontSize: 13,
											marginBottom: 2
										}}>
										{c.type} : {c.cause}
									</Text>
								))}
							</View>
						) : null}
					</TouchableOpacity>
				</View>
			);
		},
		[expandedId, t]
	);

	const history: CycleHistory = props.events;
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
		(history?.runs || []).forEach(run =>
			(run.timeline || []).forEach(t => {
				if (t.elementId && t.name) names[t.elementId] = t.name;
			})
		);
		return (id: string) => names[id] || id;
	}, [history, props.cycles, cycle]);

	const rows: Row[] = useMemo(() => {
		const runs: Row[] = (history?.runs || []).map(run => ({
			key: 'run_' + run.runId,
			type: 'run',
			run
		}));
		const legacy: Row[] = (history?.legacy || []).map((event, i) => ({
			key: 'legacy_' + (event.id ?? i),
			type: 'legacy',
			event
		}));
		return legacy.length && runs.length
			? [...runs, {key: 'legacyHeader', type: 'legacyHeader'}, ...legacy]
			: [...runs, ...legacy];
	}, [history]);

	const renderItem = ({item}: {item: Row}) => {
		if (item.type === 'run') {
			const expanded = expandedId === item.key;
			return (
				<RunCard
					run={item.run}
					expanded={expanded}
					onToggle={() => setExpandedId(expanded ? null : item.key)}
					nameOf={nameOf}
				/>
			);
		}
		if (item.type === 'legacyHeader') {
			return (
				<Text
					style={{
						color: '#777',
						fontSize: 12,
						marginTop: 12,
						marginBottom: 2,
						marginHorizontal: 8
					}}>
					{t('events.older')}
				</Text>
			);
		}
		return renderLegacy(item.event);
	};

	return (
		<View style={{gap: 8, marginVertical: 4, alignSelf: 'stretch'}}>
			<View style={BoxFormStyle.boxForm}>
				<DateTimePickerForm
					mode={'datetime'}
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
				visible={props.isLoading}
				color="#32404e"
				textStyle={styles.spinnerTextStyle}
				animation="fade"
			/>
			<FlatList
				data={rows}
				renderItem={renderItem}
				keyExtractor={item => item.key}
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
