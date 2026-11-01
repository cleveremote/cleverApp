import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
	CycleRun,
	EventOrigin,
	EventStop,
	RunOutcome,
	RunTimelineEntry
} from '../../../module/process/infrasctructure/store/models/cycleHistory';

const GREEN = '#16a34a';
const BLUE = '#2563eb';
const ORANGE = '#ea580c';
const RED = '#dc2626';
const PURPLE = '#7c3aed';
const GREY = '#6b7280';
const SLATE = '#475569';
const TEXT = '#444';
const MUTED = '#777';

const OUTCOMES: Record<RunOutcome, {label: string; color: string}> = {
	RUNNING: {label: 'Running', color: BLUE},
	WAITING_CONFIRMATION: {label: 'Waiting confirmation', color: ORANGE},
	QUEUED: {label: 'Queued', color: PURPLE},
	ENDED: {label: 'Ended', color: GREEN},
	CANCELLED: {label: 'Cancelled', color: GREY},
	REFUSED: {label: 'Refused', color: RED}
};

const ORIGIN_ICONS: [RegExp, string][] = [
	[/MANUAL|USER|APP/, 'hand-pointer'],
	[/SCHEDUL|PLAN|CRON/, 'clock'],
	[/TRIGGER|SENSOR|CONDITION/, 'bolt'],
	[/GROUP|PARENT|PILOT/, 'layer-group'],
	[/QUEUE/, 'stream'],
	[/BOOT|RESUME|RESTART|RESET/, 'power-off'],
	[/CYCLE/, 'sync']
];

// Couleur de la carte selon la raison de fin, sinon selon l'issue du run.
const STOP_COLORS: [RegExp, string][] = [
	[/ERROR|FAIL|SECUR|ALARM|TIMEOUT|UNREACH|DISCONNECT|CONDITION/, RED],
	[/PREEMPT|FORCE|CONFLICT|GROUP|PARENT/, ORANGE],
	[/BOOT|RESET|RESTART|POWER/, PURPLE],
	[/USER|MANUAL|CANCEL|IGNOR/, SLATE],
	[/COMPLET|END|FINISH|DONE|DURATION/, GREEN]
];

const match = (table: [RegExp, string][], key?: string) =>
	key ? table.find(([re]) => re.test(key.toUpperCase()))?.[1] : undefined;

// 'PREEMPTED_BY_GROUP' -> 'Preempted by group'
export const humanize = (value?: string) => {
	if (!value) {
		return '';
	}
	const text = value.replace(/_/g, ' ').toLowerCase();
	return text.charAt(0).toUpperCase() + text.slice(1);
};

export const runColor = (run: CycleRun) =>
	match(STOP_COLORS, run.stop?.reason) ||
	OUTCOMES[run.outcome]?.color ||
	GREY;

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

export const formatTime = (value: any) => {
	const date = new Date(value);
	return (
		pad(date.getHours()) +
		':' +
		pad(date.getMinutes()) +
		':' +
		pad(date.getSeconds())
	);
};

export const formatDateTime = (value: any) => {
	const date = new Date(value);
	return (
		pad(date.getDate()) +
		'/' +
		pad(date.getMonth() + 1) +
		'/' +
		pad(date.getFullYear() % 100) +
		' ' +
		formatTime(value)
	);
};

// Durées en ms.
export const formatDuration = (ms?: number) => {
	if (ms === undefined || ms === null || isNaN(ms)) {
		return undefined;
	}
	const total = Math.round(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	if (h) {
		return `${h}h ${pad(m)}m`;
	}
	if (m) {
		return `${m}m ${pad(s)}s`;
	}
	return `${s}s`;
};

// Le type et l'auteur peuvent porter plusieurs noms selon la version du box.
const originType = (origin?: EventOrigin): string | undefined =>
	origin?.type || origin?.kind || origin?.source;

const originUser = (origin?: EventOrigin): string | undefined =>
	origin?.requestedBy || origin?.by || origin?.user || origin?.userName;

const originLabel = (origin?: EventOrigin) => {
	if (!origin) {
		return undefined;
	}
	const user = originUser(origin);
	const base = humanize(originType(origin)) || (user ? 'Manual' : '');
	const detail = [origin.name, user].filter(Boolean).join(' · ');
	if (!base) {
		return detail || undefined;
	}
	return detail ? `${base} · ${detail}` : base;
};

const stopLabel = (stop?: EventStop) => {
	if (!stop) {
		return undefined;
	}
	const base = humanize(stop.reason) || 'Stopped';
	const by = stop.by ? ` by ${stop.by}` : '';
	return stop.message ? `${base}${by} : ${stop.message}` : base + by;
};

const confirmationLabel = (run: CycleRun) => {
	const c = run.confirmation;
	if (!c) {
		return undefined;
	}
	if (!c.answer) {
		return run.outcome === 'WAITING_CONFIRMATION'
			? 'Waiting for an answer'
			: 'Requested';
	}
	const wait = formatDuration(c.waitMs);
	return (
		humanize(c.answer) +
		(c.answeredBy ? ` by ${c.answeredBy}` : '') +
		(wait ? ` after ${wait}` : '')
	);
};

const Badge = (props: {label: string; color: string; icon?: string}) => (
	<View
		style={{
			flexDirection: 'row',
			alignItems: 'center',
			borderRadius: 10,
			borderWidth: 1,
			borderColor: props.color,
			paddingHorizontal: 7,
			paddingVertical: 2,
			marginRight: 6,
			marginTop: 4,
			maxWidth: '100%'
		}}>
		{props.icon ? (
			<Icon
				name={props.icon}
				size={10}
				color={props.color}
				style={{marginRight: 4}}
			/>
		) : null}
		<Text
			style={{color: props.color, fontSize: 11, fontWeight: '600'}}
			numberOfLines={1}>
			{props.label}
		</Text>
	</View>
);

const Detail = (props: {label: string; value?: string; color?: string}) =>
	props.value ? (
		<Text style={{color: TEXT, fontSize: 13, marginBottom: 2}}>
			<Text style={{color: MUTED}}>{props.label} : </Text>
			<Text style={props.color ? {color: props.color} : undefined}>
				{props.value}
			</Text>
		</Text>
	) : null;

const timelineText = (entry: RunTimelineEntry) =>
	entry.message ||
	[entry.name, humanize(entry.kind)].filter(Boolean).join(' · ');

type Props = {
	run: CycleRun;
	expanded: boolean;
	onToggle: () => void;
	// Résout un id de cycle/séquence en nom lisible.
	nameOf: (id: string) => string;
};

export function RunCard({run, expanded, onToggle, nameOf}: Props) {
	const color = runColor(run);
	const outcome = OUTCOMES[run.outcome] || {
		label: humanize(run.outcome),
		color: GREY
	};
	const origin = originLabel(run.origin);
	const real = formatDuration(run.realDuration);
	const planned = formatDuration(run.plannedDuration);
	const duration = real
		? planned
			? `${real} / ${planned}`
			: real
		: planned
		? `planned ${planned}`
		: undefined;
	const names = (ids?: string[]) =>
		ids?.length ? ids.map(nameOf).join(', ') : undefined;

	return (
		<View style={{marginVertical: 4}}>
			<TouchableOpacity
				activeOpacity={0.7}
				onPress={onToggle}
				style={{
					flexDirection: 'row',
					alignSelf: 'stretch',
					backgroundColor: 'white',
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22,
					marginHorizontal: 4,
					overflow: 'hidden'
				}}>
				<View style={{width: 5, backgroundColor: color}} />
				<View style={{flex: 1, paddingVertical: 8, paddingHorizontal: 10}}>
					<View style={{flexDirection: 'row', alignItems: 'center'}}>
						<Text
							style={{
								flex: 1,
								color: 'black',
								fontWeight: 'bold',
								fontSize: 15
							}}
							numberOfLines={1}>
							{run.name || nameOf(run.cycleId)}
						</Text>
						<Text style={{color: MUTED, fontSize: 12, marginLeft: 8}}>
							{formatDateTime(run.startedAt || run.requestedAt)}
						</Text>
						<Text
							style={{marginLeft: 8, color: '#32404e', fontSize: 12}}>
							{expanded ? '▲' : '▼'}
						</Text>
					</View>

					<View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
						<Badge label={outcome.label} color={outcome.color} />
						{origin ? (
							<Badge
								label={origin}
								color={SLATE}
								icon={
									match(ORIGIN_ICONS, originType(run.origin)) ||
									'play'
								}
							/>
						) : null}
						{run.stop?.reason && run.outcome !== 'RUNNING' ? (
							<Badge label={humanize(run.stop.reason)} color={color} />
						) : null}
						{duration ? (
							<Badge label={duration} color={GREY} icon="hourglass-half" />
						) : null}
					</View>

					{run.message ? (
						<Text
							style={{color: TEXT, fontSize: 13, marginTop: 6}}
							numberOfLines={expanded ? undefined : 2}>
							{run.message}
						</Text>
					) : null}

					{expanded ? (
						<View
							style={{
								marginTop: 8,
								borderTopWidth: 1,
								borderTopColor: '#eee',
								paddingTop: 6
							}}>
							<Detail
								label="Requested"
								value={formatDateTime(run.requestedAt)}
							/>
							<Detail
								label="Started"
								value={
									run.startedAt
										? formatDateTime(run.startedAt)
										: undefined
								}
							/>
							<Detail
								label="Ended"
								value={
									run.endedAt
										? formatDateTime(run.endedAt)
										: undefined
								}
							/>
							<Detail label="Confirmation" value={confirmationLabel(run)} />
							<Detail label="Stop" value={stopLabel(run.stop)} color={color} />
							<Detail label="Sequences run" value={names(run.sequences?.run)} />
							<Detail
								label="Skipped"
								value={names(run.sequences?.skipped)}
								color={GREY}
							/>
							<Detail
								label="Forced"
								value={names(run.sequences?.forced)}
								color={ORANGE}
							/>
							<Detail
								label="Stopped cycles"
								value={names(run.preempted)}
								color={ORANGE}
							/>
							<Detail
								label="Started by run"
								value={run.parentRunId}
							/>
							{run.conditions?.length ? (
								<>
									<Text
										style={{
											color: RED,
											fontSize: 13,
											fontWeight: 'bold',
											marginTop: 4
										}}>
										Conditions not verified
									</Text>
									{run.conditions.map((c, i) => (
										<Text
											key={'cond' + i}
											style={{color: TEXT, fontSize: 13, marginLeft: 8}}>
											{'• ' + c}
										</Text>
									))}
								</>
							) : null}

							{run.timeline?.length ? (
								<View style={{marginTop: 6}}>
									<Text
										style={{
											color: '#32404e',
											fontSize: 13,
											fontWeight: 'bold',
											marginBottom: 2
										}}>
										Timeline
									</Text>
									{run.timeline.map((entry, i) => {
										const isSequence =
											entry.elementType === 'SEQUENCE';
										return (
											<View
												key={'tl' + i}
												style={{
													flexDirection: 'row',
													marginLeft: isSequence ? 14 : 0,
													marginBottom: 2
												}}>
												<Text
													style={{
														color: MUTED,
														fontSize: 12,
														width: 62
													}}>
													{formatTime(entry.date)}
												</Text>
												<Text
													style={{
														flex: 1,
														color: isSequence ? MUTED : TEXT,
														fontSize: 13
													}}>
													{timelineText(entry)}
												</Text>
											</View>
										);
									})}
								</View>
							) : null}
						</View>
					) : null}
				</View>
			</TouchableOpacity>
		</View>
	);
}
