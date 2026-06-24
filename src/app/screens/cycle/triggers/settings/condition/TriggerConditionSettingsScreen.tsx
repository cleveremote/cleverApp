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
	loadCondition,
	saveCondition
} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {saveTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';

function TriggerConditionSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.condition?.id);
	isModified.current = props.condition?.isModified;

	const conditionRef = useRef(props.condition);
	conditionRef.current = props.condition;

	const conditionsRef = useRef(props.conditions);
	conditionsRef.current = props.conditions;

	const checkChanges = (e: any) => {
		if (!isModified.current && !conditionRef.current?.isModified) return;
		e.preventDefault();
		props.saveCondition(conditionRef.current, true, () => {
			props.navigation.dispatch(e.data.action);
		});
	};

	const _deleteItem = () => {
		conditionRef.current = {
			...conditionRef.current,
			id: `deleted_${props.condition.id}`,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadCondition(
			props.route.params.condition?.id,
			props.route.params.condition?.triggerId ||
				props.route.params.trigger.id
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
							'TriggerConditionGeneralSettingsSection',
							{
								conditionData: props.condition
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
							'TriggerConditionParamSettingsSection',
							{
								conditionData: props.condition
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
	condition: state.trigger_condition.condition,
	conditions: state.trigger_condition.conditions,
	trigger: state.cycle_trigger.trigger
});

export default connect(mapStateToProps, {
	saveCondition,
	loadCondition,
	saveTrigger
})(TriggerConditionSettingsScreen);
