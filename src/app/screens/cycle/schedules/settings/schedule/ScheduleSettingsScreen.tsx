import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../../components/common/cycleMenu';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faBolt, faGear} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {
	loadSchedule,
	saveSchedule,
	updateSchedule
} from '../../../../../../module/process/infrasctructure/store/actions/schedule';
import {saveCycle} from '../../../../../../module/process/infrasctructure/store/actions/cycle';

const serializeSchedule = (schedule: any) => {
	if (!schedule?.cron?.date || !(schedule.cron.date instanceof Date))
		return schedule;
	return {
		...schedule,
		cron: {...schedule.cron, date: schedule.cron.date.getTime()}
	};
};

export function ScheduleSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.item?.id);
	isModified.current = props.schedule?.isModified;

	const scheduleRef = useRef(props.schedule);
	scheduleRef.current = props.schedule;

	const schedulesRef = useRef(props.schedules);
	schedulesRef.current = props.schedules;

	const checkChanges = (e: any) => {
		if (!isModified.current && !scheduleRef.current?.isModified) return;
		e.preventDefault();
		props.saveSchedule(scheduleRef.current, true, () => {
			() => console.log('Schedule saved successfully!'); // Callback after saving the schedule
			props.navigation.dispatch(e.data.action);
			// props.saveCycle(
			// 	{
			// 		...props.route.params.cycle,
			// 		schedules: schedulesRef.current ?? []
			// 	},
			// 	true,
			// 	() => props.navigation.dispatch(e.data.action)
			// );
		});
	};

	const _deleteItem = () => {
		scheduleRef.current = {
			...scheduleRef.current,
			id: `deleted_${props.schedule.id}`,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadSchedule(
			props.route.params.schedule?.id,
			props.route.params.schedule?.cycleId || props.route.params.cycle.id
		);

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

		const unsubscribe = props.navigation.addListener(
			'beforeRemove',
			checkChanges
		);
		return unsubscribe;
	}, []);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<MenuAccordion
					key={21}
					name={'General'}
					icon={faGear}
					onPress={() =>
						props.navigation.navigate(
							'ScheduleGeneralSettingsSection',
							{
								scheduleData: serializeSchedule(props.schedule)
							}
						)
					}
				/>
				<MenuAccordion
					key={41}
					name={'Execution'}
					icon={faBolt}
					onPress={() =>
						props.navigation.navigate(
							'ScheduleExecutionSettingsSection',
							{
								scheduleData: serializeSchedule(props.schedule)
							}
						)
					}
				/>
				<DeleteItemMenu key={61} OnConfirm={_deleteItem} />
			</View>
		</View>
	);
}

const COLORS = {
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	container: {
		alignSelf: 'stretch'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	}
});

const mapStateToProps = (state: any) => ({
	schedule: state.cycle_schedule.schedule,
	schedules: state.cycle_schedule.schedules,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	saveSchedule,
	loadSchedule,
	saveCycle,
	updateSchedule
})(ScheduleSettingsScreen);
