import {StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import React, {useCallback, useEffect, useRef} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {elementStack} from '../../../../../components/cycle/moduleStack';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	loadConditions,
	saveConditions
} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {
	saveTrigger,
	updateTrigger
} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {useFocusEffect} from '@react-navigation/native';

const PRIMARY_COLOR = '#32404e';
const CARD_BG_COLOR = 'white';
const SHADOW_COLOR = '#000';

function TriggerConditionsSection(props: any) {
	const conditionsRef = useRef(props.conditions);
	conditionsRef.current = props.conditions;
	const updateTriggerRef = useRef(props.updateTrigger);
	updateTriggerRef.current = props.updateTrigger;
	const triggerDataRef = useRef(props.route.params.triggerData);
	triggerDataRef.current = props.route.params.triggerData;

	const checkChanges = (e: any) => {
		const hasModified = !!conditionsRef.current?.some(
			(x: any) => x.isModified
		);
		if (!hasModified && !triggerDataRef.current.isModified) return;
		if (!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(e.data.action.type))
			return;

		e.preventDefault();

		props.saveConditions(conditionsRef.current, () => {
			props.updateTrigger(
				{
					...triggerDataRef.current,
					conditions: conditionsRef.current ?? []
				},
				() => props.navigation.dispatch(e.data.action)
			);
		});
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
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

		props.loadConditions(props.route.params.triggerData);
		return () => listenerUnsubscribe();
	}, []);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{props.conditions.map((element: any) =>
					element.id && element.id.indexOf('deleted_') > -1
						? null
						: elementStack(
								element,
								(item: any) => {
									props.navigation.navigate(
										'ConditionSettingsStack',
										{
											screen: 'TriggerConditionSettingsScreen',
											params: {
												trigger:
													props.route.params
														.triggerData,
												condition: item
											}
										}
									);
								},
								`condition ${element.description}`,
								{name: faCog, color: PRIMARY_COLOR}
						  )
				)}
				<View style={styles.addButtonWrapper}>
					<TouchableOpacity
						style={styles.addButton}
						onPress={async () => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate(
								'ConditionSettingsStack',
								{
									screen: 'TriggerConditionSettingsScreen',
									params: {
										trigger: props.route.params.triggerData
									}
								}
							);
						}}>
						<Icon
							name="times-circle"
							size={30}
							color={PRIMARY_COLOR}
						/>
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new condition ...</Text>
				</View>
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	conditions: state.trigger_condition.conditions
});

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		margin: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: CARD_BG_COLOR,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: SHADOW_COLOR,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	addButtonWrapper: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: PRIMARY_COLOR,
		fontSize: 15
	}
});

export default connect(mapStateToProps, {
	loadConditions,
	saveConditions,
	updateTrigger
})(TriggerConditionsSection);
