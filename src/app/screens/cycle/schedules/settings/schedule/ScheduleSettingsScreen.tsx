import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../../components/common/cycleMenu';
import {SettingsScrollView} from '../../../../../components/common/SettingsScrollView';
import {
	useSectionSettingsHeader,
	isEmpty
} from '../../../../../components/common/useSectionSettingsHeader';
import {faGear, faCalendarPlus} from '@fortawesome/free-solid-svg-icons';
import {
	loadSchedule,
	saveSchedule,
	updateSchedule
} from '../../../../../../module/process/infrasctructure/store/actions/schedule';
import {saveCycle} from '../../../../../../module/process/infrasctructure/store/actions/cycle';
import ScheduleGeneralSettingsSection from './ScheduleGeneralSettingsSection';
import NewSchedulingSection from './NewSchedulingSection';

const serializeSchedule = (schedule: any) => {
	if (!schedule?.cron?.date || !(schedule.cron.date instanceof Date))
		return schedule;
	return {
		...schedule,
		cron: {...schedule.cron, date: schedule.cron.date.getTime()}
	};
};

export function ScheduleSettingsScreen(props: any) {
	const isNew = !props.route.params.schedule?.id;
	const scheduleRef = useRef(props.schedule);
	scheduleRef.current = props.schedule;

	const schedulesRef = useRef(props.schedules);
	schedulesRef.current = props.schedules;

	const _deleteItem = () => {
		scheduleRef.current = {
			...scheduleRef.current,
			delete: true,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadSchedule(
			props.route.params.schedule?.id,
			props.route.params.schedule?.cycleId || props.route.params.cycle.id
		);
	}, []);

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.schedule,
		isNew,
		hasChanges: () => !!scheduleRef.current?.isModified,
		save: onDone => props.saveSchedule(scheduleRef.current, true, onDone),
		validate: () => ({
			general: isEmpty(scheduleRef.current?.name),
			// Exécution valide dès qu'un mode est configuré : cron (pattern) OU
			// une date planifiée.
			execution:
				isEmpty(scheduleRef.current?.cron?.pattern) &&
				isEmpty(scheduleRef.current?.cron?.date) &&
				!scheduleRef.current?.cron?.sunBehavior
		})
	});

	return (
		<SettingsScrollView>
			<View style={styles.card}>
				<MenuAccordion
					key={21}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					<ScheduleGeneralSettingsSection
						embedded
						scheduleData={serializeSchedule(props.schedule)}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<MenuAccordion
					key={41}
					name={'New Scheduling'}
					icon={faCalendarPlus}
					invalid={invalidSections.execution}
					onPress={() => {}}>
					<NewSchedulingSection
						embedded
						scheduleData={serializeSchedule(props.schedule)}
						showErrors={invalidSections.execution}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<DeleteItemMenu key={61} OnConfirm={_deleteItem} />
			</View>
		</SettingsScrollView>
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
