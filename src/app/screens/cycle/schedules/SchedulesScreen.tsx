import {TouchableOpacity, View, Text} from 'react-native';
import React, {useEffect} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {elementStack} from '../../../components/cycle/moduleStack';
import {hapticOptions} from '../../../data/cycleTypes';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {loadSchedules} from '../../../../module/process/infrasctructure/store/actions/schedule';
import {
	saveCycle,
	updateCycle
} from '../../../../module/process/infrasctructure/store/actions/cycle';

export function SchedulesScreen(props: any) {
	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		props.loadSchedules(props.route.params.cycle);
	}, []);

	useEffect(() => {
		props.saveCycle(
			{...props.route.params.cycle, schedules: props.schedules},
			true
		);
	}, [props.schedules]);

	return (
			<View style={{gap: 8, marginVertical: 4, alignSelf: 'stretch', margin: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.22, shadowRadius: 2.22}}>
				<View style={{alignSelf: 'stretch', backgroundColor: 'white', borderRadius: 12, padding: 8}}>
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
												params: {schedule: item}
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
								props.navigation.navigate(
									'ScheduleSettingsStack',
									{
										screen: 'ScheduleSettingsMenu',
										params: {
											cycle: props.route.params.cycle
										}
									}
								);
							}}>
							<Icon name='times-circle' size={30} color="#32404e" />
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
	schedules: state.cycle_schedule.schedules
});

export default connect(mapStateToProps, {
	loadSchedules,
	saveCycle
})(SchedulesScreen);
