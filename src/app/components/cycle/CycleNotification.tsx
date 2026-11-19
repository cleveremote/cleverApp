import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { connect } from 'react-redux';
import i18n from 'i18next';
import { hapticOptions } from '../../data/cycleTypes';
import {
	dismissCycleNotification,
	fetchLastRun
} from '../../../module/process/infrasctructure/store/actions/cycle';
import {
	CycleRun,
	RunOutcome
} from '../../../module/process/infrasctructure/store/models/cycleHistory';
import { RunCard } from './RunCard';
import { isNotificationDismissed } from '../../../module/process/infrasctructure/store/models/dismissedNotifications';

const BACKGROUND = '#fff7ed';
const BORDER = '#fdba74';
const ACCENT = '#ea580c';
const TEXT = '#9a3412';

const arrow = {
	position: 'absolute' as const,
	left: 14,
	width: 0,
	height: 0,
	borderLeftWidth: 7,
	borderRightWidth: 7,
	borderBottomWidth: 7,
	borderLeftColor: 'transparent',
	borderRightColor: 'transparent'
};

const GAP = 6;

// Sur une carte de cycle/groupe, le bloc menu remonte sur la carte (marginTop
// -37) et se termine au-dessus de son bas, à une hauteur qui dépend de l'icône.
// On mesure les deux pour placer le bandeau à GAP du bas de la carte (ou du
// menu s'il est ouvert), comme pour une séquence, sans toucher à la stack.
export const useBelowCard = () => {
	const [cardBottom, setCardBottom] = useState(0);
	const [menuBottom, setMenuBottom] = useState(0);
	const bottomOf = (set: (v: number) => void) => (e: any) => {
		const { y, height } = e.nativeEvent.layout;
		set(y + height);
	};
	return {
		onCardLayout: bottomOf(setCardBottom),
		onMenuLayout: bottomOf(setMenuBottom),
		marginTop: Math.max(cardBottom - menuBottom, 0) + GAP
	};
};

// Le box attend une confirmation pour démarrer l'exécutable.
export const CONFLICT = 'WAITTING_CONFIRMATION';

// Clés i18n (namespace cycle) des messages du bandeau.
const MESSAGES: Record<string, 'notification.conditionsNotVerified' | 'notification.waitingConfirmation'> = {
	CONDITIONS_NOT_VERIFIED: 'notification.conditionsNotVerified',
	[CONFLICT]: 'notification.waitingConfirmation'
};

const CONFIRMATION_MESSAGES = {
	CONFLICT: 'notification.waitingConfirmation',
	SCHEDULED: 'notification.scheduled'
} as const;

const message = (key?: string) =>
	key ? i18n.t(key as never, { ns: 'cycle' }) as string : undefined;

const IN_PROCESS = 'IN_PROCCESS';
const EXECUTABLE_TYPES = ['CYCLE', 'SEQUENCE'];

type ConfirmationConflict = {
	cycleId: string;
	name: string;
	mode: string;
	// true : confirmer stoppera ce cycle ; false : rang égal ou plus grand.
	isWinning: boolean;
	// Cycle PROPORTIONAL en cours : le box demande une confirmation même
	// quand il est battu, pour ne pas reprendre sa vanne sans prévenir.
	isProportionalOverride?: boolean;
};

type ConfirmationKind = keyof typeof CONFIRMATION_MESSAGES;

const isRunning = (id: string, statusList: any[]) =>
	statusList.find((x: any) => x?.id === id)?.status === IN_PROCESS;

// Le cycle en face est-il encore en cours ? Inconnu localement (cycle SYSTEM
// ou proportionnel dont le status n'a pas été poussé) : on fait confiance au
// box, qui vient de le signaler en conflit. Connu : il doit tourner.
const isConflictRunning = (id: string, statusList: any[]) => {
	const other = statusList.find((x: any) => x?.id === id);
	return !other || other.status === IN_PROCESS;
};

// Conflits encore d'actualité : un conflit n'a de sens que tant que le cycle
// en face tourne. Exception : la reprise d'un PROPORTIONAL. Le box la fait
// confirmer même vanne à 0 % ou cycle arrêté, et son status local n'est pas
// fiable (WAITTING_CONFIRMATION au fetch, STOPPED après un slider à 0) : tant
// que le cycle attend, la confirmation reste à faire.
const activeConflicts = (
	entry: any,
	statusList: any[]
): ConfirmationConflict[] =>
	(entry?.confirmation?.conflicts || []).filter(
		(c: ConfirmationConflict) =>
			c.isProportionalOverride || isConflictRunning(c.cycleId, statusList)
	);

// Ancien payload (sans `confirmation`) : les causes de type CYCLE/SEQUENCE
// désignent les exécutables en conflit ; sans elles, on retombe sur « un
// autre cycle est en cours ».
const legacyConflictActive = (entry: any, statusList: any[]) => {
	const others = (entry.causes || []).filter((c: any) =>
		EXECUTABLE_TYPES.includes(c?.type)
	);
	return others.length
		? others.some((c: any) => isRunning(c.id, statusList))
		: statusList.some(
				(x: any) =>
					x?.id !== entry.id &&
					x?.type === 'CYCLE' &&
					x?.status === IN_PROCESS
		  );
};

// Origine de l'attente de confirmation : conflit perdu (un cycle de rang égal
// ou supérieur tourne), cycle PROPORTIONAL à reprendre, ou schedule/trigger
// avec shouldConfirmation. undefined si plus rien n'est à confirmer.
const confirmationKind = (
	entry: any,
	statusList: any[]
): ConfirmationKind | undefined => {
	if (entry?.status !== CONFLICT) {
		return undefined;
	}
	if (!entry.confirmation) {
		return legacyConflictActive(entry, statusList) ? 'CONFLICT' : undefined;
	}
	if (
		activeConflicts(entry, statusList).some(
			c => !c.isWinning || c.isProportionalOverride
		)
	) {
		return 'CONFLICT';
	}
	return entry.confirmation.isRequested ? 'SCHEDULED' : undefined;
};

// Vrai tant que le bandeau de conflit est affiché pour cette entrée : le
// menu de la carte (icône d'attente) suit la même règle.
export const isConflictShown = (entry: any, statusList: any[] = []) =>
	!!confirmationKind(entry, statusList);

// Message du bandeau pour une entrée de status, ou undefined s'il n'y en a
// pas. `withConflict` : l'appelant gère les actions d'un conflit ; le
// bandeau de conflit disparaît dès que le cycle en face s'arrête.
export const notificationMessage = (
	entry: any,
	withConflict: boolean,
	statusList: any[] = []
): string | undefined => {
	if (withConflict && entry?.status === CONFLICT) {
		const kind = confirmationKind(entry, statusList);
		if (!kind) {
			return undefined;
		}
		return message(
			entry.confirmation ? CONFIRMATION_MESSAGES[kind] : MESSAGES[CONFLICT]
		);
	}
	return message(MESSAGES[entry?.notification]);
};

const quoted = (conflicts: ConfirmationConflict[]) =>
	conflicts.map(c => `"${c.name}"`).join(', ');

type Action = {
	label: string;
	icon: string;
	onPress: () => void;
	primary?: boolean;
};

// Le box décrit chaque cause sous la forme "<id> = ON (current : unknown)".
// On remplace l'id par un nom lisible quand la condition (portée par le
// cycle ou la séquence) et son élément (cycle ou capteur) sont connus
// localement.
const describeCause = (
	cause: any,
	item: any,
	cycles: any[],
	sensors: any[]
): string => {
	if (EXECUTABLE_TYPES.includes(cause.type)) {
		const all = (cycles || []).flatMap((c: any) => [
			c,
			...(c.sequences || [])
		]);
		const other = all.find((x: any) => x?.id === cause.id);
		return other
			? i18n.t('cycle:notification.inConflictWith', { name: other.name })
			: cause.cause || cause.id;
	}
	const current = /\(current\s*:\s*([^)]*)\)/.exec(cause.cause || '')?.[1];
	const condition = (item.conditions || []).find(
		(c: any) => c?.id === cause.id
	);
	if (!condition) {
		return cause.cause || cause.id;
	}
	const element = [...(cycles || []), ...(sensors || [])].find(
		(x: any) => x?.id === condition.elementId
	);
	const label = element?.name || condition.name || cause.id;
	const operator = condition.operator === '==' ? '=' : condition.operator;
	return (
		`${label} ${operator} ${condition.value}` +
		(current !== undefined
			? ` ${i18n.t('cycle:notification.current', { value: current.trim() })}`
			: '')
	);
};

// États du dernier événement affiché selon le bandeau.
const INTERRUPTED: RunOutcome[] = ['CANCELLED', 'REFUSED'];
const WAITING: RunOutcome[] = ['WAITING_CONFIRMATION'];

// Notification poussée sans runId : le run peut ne pas être encore enregistré
// côté box. On réessaie quelques fois, et l'on n'accepte qu'un run récent par
// rapport à l'arrivée de la notification (marge pour l'écart d'horloge
// box / téléphone).
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const CLOCK_SLACK_MS = 2 * 60 * 1000;
const runTime = (run: CycleRun) =>
	new Date(run.startedAt ?? run.requestedAt).getTime() || 0;

// Contenu du dernier événement du cycle (carte de l'onglet Événements,
// repliée) : remplace le texte brut du box. Rechargé quand le bandeau change
// (autre run, autre texte, autres conflits). Introuvable : `fallback`.
function LastRun({
	cycleId,
	outcomes,
	runId,
	notifiedAt,
	refreshKey,
	nameOf,
	fallback
}: Readonly<{
	cycleId: string;
	outcomes: RunOutcome[];
	runId?: string;
	notifiedAt?: number;
	refreshKey: string;
	nameOf: (id: string) => string;
	fallback?: React.ReactNode;
}>) {
	const [run, setRun] = useState<CycleRun>();
	const [done, setDone] = useState(false);
	const [expanded, setExpanded] = useState(false);
	React.useEffect(() => {
		let active = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		setRun(undefined);
		setDone(false);
		const matches = (found?: CycleRun) =>
			!!found &&
			(runId
				? found.runId === runId
				: !notifiedAt || runTime(found) >= notifiedAt - CLOCK_SLACK_MS);
		const attempt = (index: number) =>
			fetchLastRun(cycleId, outcomes, runId).then(found => {
				if (!active) return;
				if (matches(found)) {
					setRun(found);
					setDone(true);
				} else if (index < RETRY_DELAYS_MS.length) {
					timer = setTimeout(() => attempt(index + 1), RETRY_DELAYS_MS[index]);
				} else {
					setDone(true);
				}
			});
		attempt(0);
		return () => {
			active = false;
			if (timer) clearTimeout(timer);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cycleId, outcomes.join(), runId, notifiedAt, refreshKey]);
	if (!run) return done ? <>{fallback}</> : null;
	return (
		<View style={{ marginHorizontal: -4 }}>
			<RunCard
				run={run}
				expanded={expanded}
				onToggle={() => setExpanded(e => !e)}
				nameOf={nameOf}
			/>
		</View>
	);
}

export function CycleNotification(
	props: Readonly<{
		// Cycle ou séquence : l'entrée de status est retrouvée par son id.
		item: any;
		onForce: () => void;
		// Actions supplémentaires d'un conflit (WAITTING_CONFIRMATION) : le
		// bandeau de conflit n'est proposé que si l'appelant les fournit.
		onIgnore?: () => void;
		onQueue?: () => void;
		// Précision affichée au-dessus du bouton (ex. la séquence forcée
		// attendra la fin de celle en cours).
		forceHint?: string;
		// Espace au-dessus du bandeau. Une carte de séquence a déjà 4 de marge
		// basse (4 + 2 = 6) ; pour un cycle, cf. useBelowCard.
		marginTop?: number;
		forceLabel?: string;
		status?: any[];
		cycles?: any[];
		sensors?: any[];
		dismissCycleNotification: (id: string) => void;
	}>
) {
	const entry = (props.status || []).find(
		(x: any) => x?.id === props.item.id
	);
	const isConflict =
		entry?.status === CONFLICT && !!props.onIgnore && !!props.onQueue;
	const message = isNotificationDismissed(entry)
		? undefined
		: notificationMessage(entry, isConflict, props.status);
	if (!message) {
		return null;
	}

	const kind = isConflict
		? confirmationKind(entry, props.status || [])
		: undefined;
	// Nouveau payload : on liste les cycles en conflit plutôt que les causes
	// textuelles (CONFIRMATION / FORCE).
	const conflicts = entry.confirmation
		? activeConflicts(entry, props.status || [])
		: [];
	const toStop = conflicts.filter(c => c.isWinning);
	const lines: string[] = entry.confirmation
		? kind === 'CONFLICT'
			? conflicts.map(
					c =>
						i18n.t('cycle:notification.isRunning', { name: c.name }) +
						(c.isWinning
							? ''
							: ` ${i18n.t('cycle:notification.higherPriority')}`)
			  )
			: []
		: (entry.causes || []).map((cause: any) =>
				describeCause(
					cause,
					props.item,
					props.cycles || [],
					props.sensors || []
				)
		  );
	const lineViews = lines.map((line, index) => (
		<Text
			key={'line_' + index}
			style={{ color: TEXT, fontSize: 13, marginLeft: 24 }}
			numberOfLines={2}
			ellipsizeMode="middle"
		>
			{'• ' + line}
		</Text>
	));
	const hint =
		kind === 'CONFLICT' && conflicts.length
			? i18n.t('cycle:notification.forceWillStop', { names: quoted(conflicts) })
			: kind === 'SCHEDULED' && toStop.length
			? i18n.t('cycle:notification.confirmWillStop', { names: quoted(toStop) })
			: props.forceHint;

	const actions: Action[] =
		kind === 'SCHEDULED'
			? [
					{ label: i18n.t('cycle:notification.ignore'), icon: 'times', onPress: props.onIgnore! },
					{
						label: i18n.t('cycle:notification.confirmStart'),
						icon: 'play',
						onPress: props.onForce,
						primary: true
					}
			  ]
			: isConflict
			? [
					{ label: i18n.t('cycle:notification.ignore'), icon: 'times', onPress: props.onIgnore! },
					{ label: i18n.t('cycle:notification.queue'), icon: 'stream', onPress: props.onQueue! },
					{
						label: i18n.t('cycle:notification.force'),
						icon: 'play',
						onPress: props.onForce,
						primary: true
					}
			  ]
			: [
				// Conditions non vérifiées : Ignore masque simplement le bandeau.
				{ label: i18n.t('cycle:notification.ignore'), icon: 'times', onPress: () => {} },
				{
					label: props.forceLabel || i18n.t('cycle:notification.forceStart'),
					icon: 'play',
					onPress: props.onForce,
					primary: true
				}
		  ];

	return (
		// Légèrement en retrait, avec une flèche vers la carte au-dessus, pour
		// montrer que l'alerte appartient à ce cycle / cette séquence.
		<View
			style={{
				marginLeft: 24,
				marginRight: 4,
				marginTop: props.marginTop ?? 2
			}}
		>
			<View style={{ height: 7 }}>
				<View style={[arrow, { borderBottomColor: BORDER }]} />
				<View
					style={[arrow, { top: 1, borderBottomColor: BACKGROUND }]}
				/>
			</View>
			<View
				style={{
					marginTop: -1,
					padding: 10,
					borderRadius: 12,
					backgroundColor: BACKGROUND,
					borderWidth: 1,
					borderColor: BORDER,
					gap: 6
				}}
			>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8
					}}
				>
					<Icon
						name="exclamation-triangle"
						size={16}
						color={ACCENT}
					/>
					<Text
						style={{ flex: 1, fontWeight: 'bold', color: TEXT }}
						numberOfLines={2}
					>
						{message}
					</Text>
				</View>

				{/* Dernier événement du cycle, à la place du texte du box : le run
				    en attente pour une confirmation (les cycles en conflit restent
				    listés dessous), le dernier interrompu pour des conditions non
				    vérifiées (à la place du détail des causes, affiché seulement
				    si l'événement est introuvable). */}
				{entry.type === 'CYCLE' ? (
					<LastRun
						cycleId={props.item.id}
						outcomes={isConflict ? WAITING : INTERRUPTED}
						runId={entry.runId}
						notifiedAt={entry.notifiedAt}
						refreshKey={[
							entry.status,
							entry.eventDate,
							entry.message,
							(entry.confirmation?.conflicts || [])
								.map((c: ConfirmationConflict) => c.cycleId)
								.join()
						].join('|')}
						nameOf={(id: string) =>
							[
								...(props.cycles || []),
								...(props.cycles || []).flatMap(
									(c: any) => c.sequences || []
								)
							].find((x: any) => x?.id === id)?.name ?? id
						}
						fallback={isConflict ? null : lineViews}
					/>
				) : null}

				{isConflict || entry.type !== 'CYCLE' ? lineViews : null}

				{hint ? (
					<Text
						style={{
							color: TEXT,
							fontSize: 12,
							fontStyle: 'italic'
						}}
					>
						{hint}
					</Text>
				) : null}

				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'flex-end',
						gap: 8
					}}
				>
					{actions.map(action => (
						<TouchableOpacity
							key={action.label}
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								gap: 6,
								paddingVertical: 6,
								paddingHorizontal: 12,
								borderRadius: 8,
								borderWidth: 1,
								borderColor: ACCENT,
								backgroundColor: action.primary
									? ACCENT
									: 'transparent'
							}}
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								// Le status d'un conflit est mis à jour par le
								// box en réponse à l'action.
								if (!isConflict) {
									props.dismissCycleNotification(
										props.item.id
									);
								}
								action.onPress();
							}}
						>
							<Icon
								name={action.icon}
								size={12}
								color={action.primary ? '#fff' : ACCENT}
							/>
							<Text
								style={{
									color: action.primary ? '#fff' : ACCENT,
									fontWeight: 'bold'
								}}
							>
								{action.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status,
	cycles: state.root_cycle.cycles,
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, { dismissCycleNotification })(
	CycleNotification
);
