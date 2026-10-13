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
	loadTriggers,
	saveTriggers
} from '../../../../module/process/infrasctructure/store/actions/trigger';
import {saveCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';

type Trigger = {
	id?: string;
	name?: string;
	isModified?: boolean;
	conditions?: any[];
	[key: string]: unknown;
};

export function TriggersScreen(props: any) {
	const cycleParamRef = useRef(props.route.params.cycle);
	cycleParamRef.current = props.route.params.cycle;

	const triggersRef = useRef<Trigger[]>(props.triggers);
	triggersRef.current = props.triggers;

	useEffect(() => {
		props.loadTriggers(cycleParamRef.current);
	}, []);

	// Ajout / édition / suppression sont mis en attente dans le slice par les
	// sous-écrans : la liste n'est persistée que par le bouton save de l'entête.
	// Tant que rien n'a changé, l'entête n'affiche qu'un simple retour.
	useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.triggers,
		isNew: false,
		backWhenPristine: true,
		hasChanges: () =>
			!!triggersRef.current?.some(
				x => x.isModified || x.conditions?.some(c => c.isModified)
			),
		save: onDone => {
			const updated = (triggersRef.current ?? []).map(x => ({
				...x,
				isModified: false,
				conditions: x.conditions?.map(c => ({
					...c,
					isModified: false
				}))
			}));
			props.saveTriggers(
				{...cycleParamRef.current, triggers: updated},
				onDone
			);
		},
		// Abandon : on remet la liste telle qu'elle était à l'entrée sur l'écran
		// (les modifications en attente ne vivaient que dans le slice).
		discard: () => props.loadTriggers(cycleParamRef.current)
	});

	const triggers: Trigger[] = props.triggers ?? [];

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{triggers
					.filter((element: Trigger) => !element.delete)
					.map((element: Trigger) =>
						elementStack(
							element,
							(item: Trigger) => {
								props.navigation.navigate(
									'TriggerSettingsStack',
									{
										screen: 'TriggerSettingsMenu',
										params: {
											trigger: item,
											cycle: cycleParamRef.current
										}
									}
								);
							},
							`trigger ${element.description}`,
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
							props.navigation.navigate('TriggerSettingsStack', {
								screen: 'TriggerSettingsMenu',
								params: {
									cycle: cycleParamRef.current
								}
							});
						}}>
						<Icon name="times-circle" style={styles.icon} />
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new trigger ...</Text>
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
	triggers: state.cycle_trigger.triggers
});

export default connect(mapStateToProps, {
	loadTriggers,
	saveCycle,
	saveTriggers
})(TriggersScreen);
