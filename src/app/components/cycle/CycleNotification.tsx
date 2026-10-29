import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { connect } from 'react-redux';
import { hapticOptions } from '../../data/cycleTypes';
import { dismissCycleNotification } from '../../../module/process/infrasctructure/store/actions/cycle';

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

// Conflit : le box attend une confirmation pour démarrer l'exécutable.
const CONFLICT = 'WAITTING_CONFIRMATION';

const MESSAGES: Record<string, string> = {
	CONDITIONS_NOT_VERIFIED: 'Not started: conditions not verified',
	[CONFLICT]: 'Conflict: waiting for confirmation to start'
};

const IN_PROCESS = 'IN_PROCCESS';
const EXECUTABLE_TYPES = ['CYCLE', 'SEQUENCE'];

// Un conflit n'a de sens que tant que l'exécutable en face tourne. Les causes
// de type CYCLE/SEQUENCE désignent les exécutables en conflit ; sans elles, on
// retombe sur « un autre cycle est en cours ».
const conflictActive = (entry: any, statusList: any[]) => {
	const running = (id: string) =>
		statusList.find((x: any) => x?.id === id)?.status === IN_PROCESS;
	const others = (entry.causes || []).filter((c: any) =>
		EXECUTABLE_TYPES.includes(c?.type)
	);
	return others.length
		? others.some((c: any) => running(c.id))
		: statusList.some(
				(x: any) =>
					x?.id !== entry.id &&
					x?.type === 'CYCLE' &&
					x?.status === IN_PROCESS
		  );
};

// Vrai tant que le bandeau de conflit est affiché pour cette entrée : le
// menu de la carte (icône d'attente) suit la même règle.
export const isConflictShown = (entry: any, statusList: any[] = []) =>
	entry?.status === CONFLICT && conflictActive(entry, statusList);

// Message du bandeau pour une entrée de status, ou undefined s'il n'y en a
// pas. `withConflict` : l'appelant gère les actions d'un conflit ; le
// bandeau de conflit disparaît dès que le cycle en face s'arrête.
export const notificationMessage = (
	entry: any,
	withConflict: boolean,
	statusList: any[] = []
): string | undefined => {
	if (withConflict && entry?.status === CONFLICT) {
		return conflictActive(entry, statusList)
			? MESSAGES[CONFLICT]
			: undefined;
	}
	return MESSAGES[entry?.notification];
};

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
			? `In conflict with "${other.name}"`
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
		(current !== undefined ? ` (current: ${current.trim()})` : '')
	);
};

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
	const message = notificationMessage(entry, isConflict, props.status);
	if (!message) {
		return null;
	}

	const causes: any[] = entry.causes || [];

	const actions: Action[] = isConflict
		? [
				{ label: 'Ignore', icon: 'times', onPress: props.onIgnore! },
				{ label: 'Queue', icon: 'stream', onPress: props.onQueue! },
				{
					label: 'Force',
					icon: 'play',
					onPress: props.onForce,
					primary: true
				}
		  ]
		: [
				// Conditions non vérifiées : Ignore masque simplement le bandeau.
				{ label: 'Ignore', icon: 'times', onPress: () => {} },
				{
					label: props.forceLabel || 'Force start',
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

				{causes.map((cause: any) => (
					<Text
						key={cause.id}
						style={{ color: TEXT, fontSize: 13, marginLeft: 24 }}
						numberOfLines={2}
						ellipsizeMode="middle"
					>
						{'• ' +
							describeCause(
								cause,
								props.item,
								props.cycles || [],
								props.sensors || []
							)}
					</Text>
				))}

				{props.forceHint ? (
					<Text
						style={{
							color: TEXT,
							fontSize: 12,
							fontStyle: 'italic'
						}}
					>
						{props.forceHint}
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
