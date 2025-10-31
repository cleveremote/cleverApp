import * as React from 'react';
import {Box, Flex, IconButton, Progress, Text} from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCog, faForward} from '@fortawesome/free-solid-svg-icons';
import {styles} from '../../styles/cycleStyles';
import {hapticOptions} from '../../data/cycleTypes';
import {connect} from 'react-redux';
import {loadValues} from '../../../module/process/infrasctructure/store/actions/cycle';

export function SequenceStack({
	navigation,
	isActive,
	item,
	cycleId,
	onSkip,
	stackParent,
	statusIn
}: {
	navigation: any;
	isActive: boolean;
	item: any;
	cycleId: string;
	onSkip: (sequenceId: string) => void;
	stackParent?: boolean;
	statusIn?: any;
}) {
	const [progression, setProgression] = React.useState(0);
	const [miliseconds, setMiliseconds] = React.useState(0);
	const previousStatus = React.useRef('STOPPED');

	const getTimerParams = (
		startedAt: string,
		duration: number,
		status: string
	) => {
		const now = new Date();
		const startDate = new Date(startedAt);
		const date1utc = Date.UTC(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			now.getHours(),
			now.getMinutes(),
			now.getSeconds()
		);
		const date2utc = Date.UTC(
			startDate.getFullYear(),
			startDate.getMonth(),
			startDate.getDate(),
			startDate.getHours(),
			startDate.getMinutes(),
			startDate.getSeconds()
		);
		const diff = date1utc - date2utc;
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
			let seconds = duration / 1000;
			// 2- Extract hours:
			const hours = Math.floor(seconds / 3600);
			seconds = seconds % 3600;
			// 3- Extract minutes:
			const minutes = Math.floor(seconds / 60);
			// 4- Keep only seconds not extracted to minutes:
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
				//// composant utilisé pour les sequences settings cycle
				let timerId: any;
				const statusData = statusIn.find((x: any) => x.id === item.id);
				const status = statusData?.status;
				const timerSpeed = 1000; //// increments by 1 senconds
				const startedAt = statusData?.startedAt;
				const duration = statusData?.duration || item.maxDuration;
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

					timerId = setInterval(() => {
						setProgression(progression =>
							progression + timerParams.step < 100
								? progression + timerParams.step
								: 100
						);
						setMiliseconds((ms: number) => ms - timerSpeed);
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

	return (
		<Box
			alignSelf="stretch"
			bg={isActive ? '#32404e' : 'white'}
			rounded="xl"
			shadow={3}
			m={1}>
			<Flex direction="row">
				<Text
					flex={1}
					alignSelf={'flex-start'}
					style={
						isActive ? styles.textSequenceDrag : styles.textSequence
					}
					my={2}
					ml={2}>
					{item.name}
				</Text>

				{stackParent ? (
					<Box flex={3} alignSelf={'stretch'} mt={4} mr={2}>
						<Progress
							size="xs"
							value={progression}
							rounded="xl"
							_filledTrack={{bg: '#32404e'}}
						/>
						<Text
							alignSelf={'center'}
							style={
								isActive
									? styles.textSequenceDrag
									: styles.textSequence
							}>
							{miliseconds > 0
								? 'expected end in ' + getEndTime(miliseconds)
								: 'duration ' + getEndTime(item.maxDuration)}
						</Text>
					</Box>
				) : null}

				{stackParent && miliseconds > 0 ? (
					<Box alignSelf={'flex-end'} my={2} mr={2}>
						<IconButton
							_pressed={{_icon: {size: 35}}}
							variant="unstyled"
							size={25}
							onLongPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								onSkip(item.id);
							}}
							icon={
								<FontAwesomeIcon
									icon={faForward}
									size={24}
									style={
										isActive
											? styles.textSequenceDrag
											: styles.textSequence
									}
								/>
							}
						/>
					</Box>
				) : null}

				{!stackParent ? (
					<Box alignSelf={'flex-end'} my={2} mr={2}>
						<IconButton
							_pressed={{_icon: {size: 35}}}
							variant="unstyled"
							size={21}
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								navigation.navigate('SequenceSettingsStack', {
									screen: 'SequenceSettingsMenu',
									params: {cycleId, item}
								});
							}}
							icon={
								<FontAwesomeIcon
									icon={faCog}
									size={20}
									style={
										isActive
											? styles.textSequenceDrag
											: styles.textSequence
									}
								/>
							}
						/>
					</Box>
				) : null}
			</Flex>
		</Box>
	);
}

const mapStateToProps = (state: any) => ({
	statusIn: state.root_cycle.status
});

export default connect(mapStateToProps, {})(SequenceStack);
