import {TouchableOpacity, View, Text, Alert} from 'react-native';
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
	saveSchedule,
	updateSchedule
} from '../../../../module/process/infrasctructure/store/actions/schedule';
import {saveCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {updateSchedule as updateScheduleInList} from '../../../../module/process/infrasctructure/store/reducers/schedule-reducer-helper';
import {NavigationAction} from '@react-navigation/native';

export function SchedulesScreen(props: any) {
	const cycleParamRef = useRef(props.route.params.cycle);
	const schedulesRef = useRef(props.schedules);
	schedulesRef.current = props.schedules;
	const scheduleRef = useRef(props.schedule);
	scheduleRef.current = props.schedule;

	useEffect(() => {
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: {
				preventDefault: () => void;
				data: {action: NavigationAction};
			}) => {
				if (!scheduleRef.current?.isModified) return;
				const backActions = ['GO_BACK', 'POP', 'POP_TO_TOP'];
				if (!backActions.includes(e.data.action.type)) return;
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
								const schedule = {
									...scheduleRef.current,
									isModified: false
								};
								props.saveSchedule(schedule);
								props.saveCycle(
									{
										...cycleParamRef.current,
										schedules: updateScheduleInList(
											cycleParamRef.current.schedules ||
												[],
											schedule
										)
									},
									true
								);
								props.navigation.dispatch(e.data.action);
							}
						},
						{
							text: 'Discard',
							style: 'destructive',
							onPress: () => {
								props.updateSchedule({
									...scheduleRef.current,
									isModified: false
								});
								props.navigation.dispatch(e.data.action);
							}
						}
					]
				);
			}
		);
		return () => listenerUnsubscribe();
	}, [props]);

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
	}, [props]);

	useEffect(() => {
		cycleParamRef.current = {
			...cycleParamRef.current,
			schedules: props.schedules
		};
		saveCycle(
			{
				...cycleParamRef.current,
				schedules: props.schedules
			},
			true
		);
	}, [props.schedules]);

	return (
		<View
			style={{
				gap: 8,
				marginVertical: 4,
				alignSelf: 'stretch',
				margin: 20,
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
					borderRadius: 12,
					padding: 8
				}}>
				{props.schedules.map((element: any) =>
					element.id && element.id.indexOf('deleted_') > -1
						? null
						: elementStack(
								element,
								(item: any) => {
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
								`schedule ${element.description}`,
								{name: faCog, color: '#32404e'}
						  )
				)}
				<View style={{justifyContent: 'center', alignItems: 'center'}}>
					<TouchableOpacity
						style={{marginTop: 20, transform: [{rotate: '135deg'}]}}
						onPress={async () => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate('ScheduleSettingsStack', {
								screen: 'ScheduleSettingsMenu',
								params: {
									cycle: cycleParamRef.current
								}
							});
						}}>
						<Icon name="times-circle" size={30} color="#32404e" />
					</TouchableOpacity>
					<Text style={{color: '#32404e', fontSize: 15}}>
						Add new schedule ...
					</Text>
				</View>
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	schedules: state.cycle_schedule.schedules,
	schedule: state.cycle_schedule.schedule,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	loadSchedules,
	saveCycle,
	saveSchedule,
	updateSchedule
})(SchedulesScreen);
