import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
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
	saveSchedule
} from '../../../../../../module/process/infrasctructure/store/actions/schedule';
import {saveCycle} from '../../../../../../module/process/infrasctructure/store/actions/cycle';

export function ScheduleSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.item?.id);
	const scheduleRef = useRef(props.schedule);
	scheduleRef.current = props.schedule;

	const updateSchedule = (prevSchedules: any, schedule: any) => {
		const previous = [...prevSchedules];
		if (schedule) {
			const deleteId = schedule?.id.split('_');
			const index = previous.findIndex(
				x => x.id === (deleteId[1] || schedule?.id)
			);
			if (index > -1) {
				previous[index] = schedule;
			} else {
				previous.push(schedule);
			}
		}
		return previous;
	};

	const checkChanges = (e: any) => {
		if (!isModified.current && !scheduleRef.current?.isModified) {
			return;
		}
		saveSchedule(scheduleRef.current, true, false);
	};

	const saveSchedule = (schedule: any, haptic: boolean, goBack: boolean) => {
		if (haptic) {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		}
		isModified.current = false;
		props.saveSchedule(schedule);
		if (goBack) {
			props.navigation.goBack();
		}
	};

	const _deleteItem = () => {
		const data = {
			...scheduleRef.current,
			id: `deleted_${props.schedule.id}`
		};
		saveSchedule(data, false, true);
		props.saveCycle(
			{
				...props.route.params.cycle,
				schedules: updateSchedule(
					props.route.params.cycle.schedules || [],
					data
				)
			},
			true
		);
	};

	useEffect(() => {
		props.loadSchedule(
			props.route.params.schedule?.id,
			props.route.params.schedule?.cycleId || props.route.params.cycle.id
		);
	}, []);

	useEffect(() => {
		props.saveCycle({...props.cycle, schedules: props.schedules}, true);
	}, [props.schedules]);

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

		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				checkChanges(e);
			}
		);
		isModified.current = props.sequence?.isModified;
		return () => listenerUnsubscribe();
	}, [props.schedule]);

	return (
		<View
			style={{
				alignSelf: 'stretch',
				elevation: 3,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 1},
				shadowOpacity: 0.22,
				shadowRadius: 2.22
			}}>
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: 'white',
					marginTop: 8,
					marginHorizontal: 20,
					borderRadius: 12
				}}>
				<View>
					<View>
						<MenuAccordion
							key={21}
							name={'General'}
							icon={faGear}
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								props.navigation.navigate(
									'ScheduleGeneralSettingsSection',
									{
										scheduleData: props.schedule
									}
								);
							}}
						/>
						<MenuAccordion
							key={41}
							name={'Execution'}
							icon={faBolt}
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								props.navigation.navigate(
									'ScheduleExecutionSettingsSection',
									{
										scheduleData: props.schedule
									}
								);
							}}
						/>
						<DeleteItemMenu
							key={61}
							OnConfirm={() => {
								_deleteItem();
							}}
						/>
					</View>
				</View>
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	schedule: state.cycle_schedule.schedule,
	schedules: state.cycle_schedule.schedules,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	saveSchedule,
	loadSchedule,
	saveCycle
})(ScheduleSettingsScreen);
