import {TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import React, {useEffect, useRef} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {elementStack} from '../../../components/cycle/moduleStack';
import {useSectionSettingsHeader} from '../../../components/common/useSectionSettingsHeader';
import {hapticOptions} from '../../../data/cycleTypes';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {
	loadSchedules,
	saveSchedules
} from '../../../../module/process/infrasctructure/store/actions/schedule';
import {saveCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';

type Schedule = {
	id?: string;
	name?: string;
	isModified?: boolean;
	[key: string]: unknown;
};

export function SchedulesScreen(props: any) {
	const cycleParamRef = useRef(props.route.params.cycle);
	cycleParamRef.current = props.route.params.cycle;

	const schedulesRef = useRef<Schedule[]>(props.schedules);
	schedulesRef.current = props.schedules;

	useEffect(() => {
		props.loadSchedules(cycleParamRef.current);
	}, []);

	// Ajout / édition / suppression sont mis en attente dans le slice par les
	// sous-écrans : la liste n'est persistée que par le bouton save de l'entête.
	// Tant que rien n'a changé, l'entête n'affiche qu'un simple retour.
	useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.schedules,
		isNew: false,
		backWhenPristine: true,
		hasChanges: () => !!schedulesRef.current?.some(x => x.isModified),
		save: onDone => {
			const updated = (schedulesRef.current ?? []).map(s => ({
				...s,
				isModified: false
			}));
			props.saveSchedules(
				{...cycleParamRef.current, schedules: updated},
				onDone
			);
		},
		// Abandon : on remet la liste telle qu'elle était à l'entrée sur l'écran
		// (les modifications en attente ne vivaient que dans le slice).
		discard: () => props.loadSchedules(cycleParamRef.current)
	});

	const schedules: Schedule[] = props.schedules ?? [];

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{schedules
					.filter((element: Schedule) => !element.delete)
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
	schedules: state.cycle_schedule.schedules
});

export default connect(mapStateToProps, {
	loadSchedules,
	saveCycle,
	saveSchedules
})(SchedulesScreen);
