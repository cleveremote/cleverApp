import {TouchableOpacity, View, Text, Alert, StyleSheet} from 'react-native';
import React, {useEffect, useRef} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {elementStack} from '../../../components/cycle/moduleStack';
import {hapticOptions} from '../../../data/cycleTypes';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {
	loadSchedules,
	saveSchedules
} from '../../../../module/process/infrasctructure/store/actions/schedule';
import {saveCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {NavigationAction} from '@react-navigation/native';

type BeforeRemoveEvent = {
	preventDefault: () => void;
	data: {action: NavigationAction};
};

type Schedule = {
	id?: string;
	name?: string;
	isModified?: boolean;
	[key: string]: unknown;
};

function handleBeforeRemove(
	e: BeforeRemoveEvent,
	schedulesRef: React.MutableRefObject<Schedule[]>,
	onSave: () => void,
	onDiscard: () => void
): void {
	const hasModified = schedulesRef.current?.find(x => x.isModified);
	if (!hasModified) return;
	if (!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(e.data.action.type)) return;
	e.preventDefault();
	Alert.alert(
		'Discard changes?',
		'You have unsaved changes. Are you sure to discard them and leave the screen?',
		[
			{
				text: 'save',
				style: 'cancel',
				onPress: () => {
					ReactNativeHapticFeedback.trigger(
						'impactMedium',
						hapticOptions
					);
					onSave();
				}
			},
			{
				text: 'Discard',
				style: 'destructive',
				onPress: () => {
					ReactNativeHapticFeedback.trigger(
						'impactMedium',
						hapticOptions
					);
					onDiscard();
				}
			}
		]
	);
}

export function SchedulesScreen(props: any) {
	const cycleParamRef = useRef(props.route.params.cycle);
	cycleParamRef.current = props.route.params.cycle;

	const schedulesRef = useRef<Schedule[]>(props.schedules);
	schedulesRef.current = props.schedules;

	useEffect(() => {
		const unsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: BeforeRemoveEvent) =>
				handleBeforeRemove(
					e,
					schedulesRef,
					() => {
						const updated = schedulesRef.current.map(s => ({
							...s,
							isModified: false
						}));
						props.saveSchedules(
							{...cycleParamRef.current, schedules: updated},
							() => props.navigation.dispatch(e.data.action)
						);
					},
					() => {
						props.saveSchedules(
							cycleParamRef.current.schedules ?? [],
							() => props.navigation.dispatch(e.data.action)
						);
					}
				)
		);
		return unsubscribe;
	}, []);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		props.loadSchedules(cycleParamRef.current);
	}, []);

	const schedules: Schedule[] = props.schedules ?? [];

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{schedules
					.filter(
						(element: Schedule) =>
							!element.id?.startsWith('deleted_')
					)
					.map((element: Schedule) =>
						elementStack(
							element,
							(item: Schedule) => {
								props.navigation.navigate(
									'ScheduleSettingsStack',
									{
										screen: 'ScheduleSettingsMenu',
										params: {
											schedule: item,
											cycle: cycleParamRef.current
										}
									}
								);
							},
							`schedule ${element.name}`,
							{name: faCog, color: styles.icon.color}
						)
					)}
				<View style={styles.addRow}>
					<TouchableOpacity
						style={styles.addButton}
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate('ScheduleSettingsStack', {
								screen: 'ScheduleSettingsMenu',
								params: {cycle: cycleParamRef.current}
							});
						}}>
						<Icon name="times-circle" style={styles.icon} />
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new schedule ...</Text>
				</View>
			</View>
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		margin: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	addRow: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: COLORS.primary,
		fontSize: 15
	},
	icon: {
		color: COLORS.primary,
		fontSize: 30
	}
});

const mapStateToProps = (state: any) => ({
	schedules: state.cycle_schedule.schedules,
	schedule: state.cycle_schedule.schedule
});

export default connect(mapStateToProps, {
	loadSchedules,
	saveCycle,
	saveSchedules
})(SchedulesScreen);
