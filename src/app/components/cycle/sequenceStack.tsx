import { ELEMENT_HEIGHT, ELEMENT_FONT_SIZE } from '../../styles/metrics';
import * as React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import i18n from 'i18next';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCog, faForward } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../styles/cycleStyles';
import { hapticOptions } from '../../data/cycleTypes';
import { connect } from 'react-redux';
export function SequenceStack({
	navigation,
	isActive,
	item,
	cycleId,
	onSkip,
	stackParent,
	statusIn,
	plannedDuration
}: {
	navigation: any;
	isActive: boolean;
	item: any;
	cycleId: string;
	onSkip: (sequenceId: string) => void;
	stackParent?: boolean;
	statusIn?: any;
	// Durée prévue tant que la séquence n'a pas démarré : la sienne, ou celle
	// forcée pour le cycle. Absente : durée propre de la séquence.
	plannedDuration?: number;
}) {
	const [progression, setProgression] = React.useState(0);
	const [miliseconds, setMiliseconds] = React.useState(0);
	const previousStatus = React.useRef('STOPPED');

	const getTimerParams = (
		startedAt: string,
		duration: number,
		status: string
	) => {
		// Écart entre deux instants : indépendant du fuseau (et du changement
		// d'heure, que le passage par les heures murales faussait).
		const diff =
			Math.max(Date.now() - new Date(startedAt).getTime(), 0) || 0;
		const millisenconds = duration - diff;
		const startIndex = status === 'STOPPED' ? 0 : (diff * 100) / duration;
		const step = (100 - startIndex) / ((duration - diff) / 1000);
		return {
			startIndex,
			step,
			millisenconds,
			progression: startIndex > 100 ? 100 : startIndex
		};
	};

	const getEndTime = (duration: number) => {
		if (duration) {
			let seconds = Math.floor(duration / 1000);
			const hours = Math.floor(seconds / 3600);
			seconds = seconds % 3600;
			const minutes = Math.floor(seconds / 60);
			seconds = seconds % 60;
			const t =
				(hours < 10 ? '0' + hours : hours) +
				':' +
				(minutes < 10 ? '0' + minutes : minutes) +
				':' +
				(seconds < 10 ? '0' + seconds : seconds);
			return t;
		}
		return '...';
	};

	React.useEffect(
		() => {
			if (stackParent) {
				let timerId: any;
				const statusData = statusIn.find((x: any) => x.id === item.id);
				const status = statusData?.status;
				const timerSpeed = 1000;
				const startedAt = statusData?.startedAt;
				const duration =
					statusData?.duration || item.securityConfig.maxDuration;
				const timerParams = getTimerParams(startedAt, duration, status);

				if (previousStatus.current !== status && status === 'STOPPED') {
					setProgression(100);
					setMiliseconds(0);
				}
				previousStatus.current = statusData?.status;

				if (
					status !== 'STOPPED' &&
					startedAt &&
					statusData?.type === 'SEQUENCE'
				) {
					setMiliseconds(timerParams.millisenconds);
					setProgression(timerParams.progression);

					// Recalculé depuis startedAt à chaque tick : les timers JS
					// sont suspendus en arrière-plan, un cumul de pas laisserait
					// la barre en retard au retour au premier plan.
					timerId = setInterval(() => {
						const tick = getTimerParams(
							startedAt,
							duration,
							status
						);
						setProgression(tick.progression);
						setMiliseconds(tick.millisenconds);
					}, timerSpeed);
				}
				return () => {
					previousStatus.current = 'STOPPED';
					clearInterval(timerId);
					setProgression(0);
					setMiliseconds(0);
				};
			}
		},
		stackParent ? [statusIn] : []
	);

	// Titre court : il tient sur la ligne de la barre, à sa gauche.
	const inlineTitle = !!stackParent && (item.name?.length ?? 0) < 10;
	const title = (
		<Text
			style={[
				isActive ? styles.textSequenceDrag : styles.textSequence,
				{ fontSize: ELEMENT_FONT_SIZE, fontWeight: 'bold' },
				inlineTitle
					? { marginRight: 8 }
					: {
							flex: 1,
							marginTop: 8,
							marginBottom: !stackParent
								? 8
								: miliseconds > 0
								? 0
								: 4,
							marginLeft: 8
					  }
			]}
		>
			{item.name}
		</Text>
	);

	return (
		<View
			style={{
				alignSelf: 'stretch',
				backgroundColor: isActive ? '#32404e' : 'white',
				borderRadius: 12,
				elevation: 3,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.22,
				shadowRadius: 2.22,
				margin: 4,
				minHeight: ELEMENT_HEIGHT,
				justifyContent: 'center'
			}}
		>
			{!inlineTitle ? (
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{title}

					{!stackParent ? (
						<View
							style={{
								alignSelf: 'center',
								marginVertical: 8,
								marginRight: 8
							}}
						>
							<TouchableOpacity
								onPress={() => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									navigation.navigate(
										'SequenceSettingsStack',
										{
											screen: 'SequenceSettingsMenu',
											params: { cycleId, item }
										}
									);
								}}
							>
								<FontAwesomeIcon
									icon={faCog}
									size={20}
									style={
										isActive
											? styles.textSequenceDrag
											: styles.textSequence
									}
								/>
							</TouchableOpacity>
						</View>
					) : null}
				</View>
			) : null}
			{stackParent ? (
				<View
					style={{
						marginHorizontal: 8,
						marginTop: inlineTitle ? 8 : 0,
						marginBottom: 8
					}}
				>
					<View
						style={{ flexDirection: 'row', alignItems: 'center' }}
					>
						{inlineTitle ? title : null}
						<View
							style={{
								flex: 1,
								height: 4,
								backgroundColor: '#e0e0e0',
								borderRadius: 12,
								overflow: 'hidden'
							}}
						>
							<View
								style={{
									height: '100%',
									width: `${progression}%`,
									backgroundColor: '#32404e',
									borderRadius: 12
								}}
							/>
						</View>
						{stackParent && miliseconds > 0 ? (
							<View
								style={{
									marginLeft: 8
								}}
							>
								<TouchableOpacity
									onLongPress={() => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										onSkip(item.id);
									}}
								>
									<FontAwesomeIcon
										icon={faForward}
										size={20}
										style={
											isActive
												? styles.textSequenceDrag
												: styles.textSequence
										}
									/>
								</TouchableOpacity>
							</View>
						) : null}
					</View>
					<Text
						style={[
							isActive
								? styles.textSequenceDrag
								: styles.textSequence,
							{ alignSelf: 'center' }
						]}
					>
						{miliseconds > 0
							? i18n.t('cycle:sequence.expectedEnd', {
									time: getEndTime(miliseconds)
							  })
							: i18n.t('cycle:sequence.duration', {
									time: getEndTime(
										plannedDuration ??
											item.securityConfig?.maxDuration
									)
							  })}
					</Text>
				</View>
			) : null}
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	statusIn: state.root_cycle.status
});

export default connect(mapStateToProps, {})(SequenceStack);
