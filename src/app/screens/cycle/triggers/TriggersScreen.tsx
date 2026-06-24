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
	loadTriggers,
	saveTrigger,
	saveTriggers,
	updateTrigger
} from '../../../../module/process/infrasctructure/store/actions/trigger';
import {saveCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {NavigationAction} from '@react-navigation/native';

type BeforeRemoveEvent = {
	preventDefault: () => void;
	data: {action: NavigationAction};
};

type Trigger = {
	id?: string;
	name?: string;
	isModified?: boolean;
	conditions?: any[];
	[key: string]: unknown;
};

function handleBeforeRemove(
	e: BeforeRemoveEvent,
	triggersRef: React.MutableRefObject<Trigger[]>,
	onSave: () => void,
	onDiscard: () => void
): void {
	const hasModified = triggersRef.current?.some(
		x => x.isModified || x.conditions?.some(c => c.isModified)
	);
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

export function TriggersScreen(props: any) {
	const cycleParamRef = useRef(props.route.params.cycle);
	cycleParamRef.current = props.route.params.cycle;

	const triggersRef = useRef<Trigger[]>(props.triggers);
	triggersRef.current = props.triggers;

	useEffect(() => {
		const unsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: BeforeRemoveEvent) =>
				handleBeforeRemove(
					e,
					triggersRef,
					() => {
						triggersRef.current = triggersRef.current?.map(x => ({
							...x,
							isModified: false,
							conditions: x.conditions?.map(c => ({
								...c,
								isModified: false
							}))
						}));

						props.saveTriggers(
							{
								...cycleParamRef.current,
								triggers: triggersRef.current
							},
							() => props.navigation.dispatch(e.data.action)
						);
					},
					() => {
						props.saveTriggers(
							cycleParamRef.current.triggers ?? [],
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
		props.loadTriggers(cycleParamRef.current);
	}, []);

	const triggers: Trigger[] = props.triggers ?? [];

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{triggers
					.filter(
						(element: Trigger) =>
							!element.id?.startsWith('deleted_')
					)
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
