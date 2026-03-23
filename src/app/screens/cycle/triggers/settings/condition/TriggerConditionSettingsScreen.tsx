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
	loadCondition,
	saveCondition
} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {saveTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';

function TriggerConditionSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.condition?.id);
	const conditionRef = useRef(props.condition);
	conditionRef.current = props.condition;

	const checkChanges = (e: any) => {
		if (!isModified.current && !conditionRef.current?.isModified) {
			return;
		}
		saveCondition(conditionRef.current, true, false);
	};

	const _deleteItem = () => {
		const data = {
			...conditionRef.current,
			id: `deleted_${props.condition.id}`
		};
		saveCondition(data, false, true);
		const updateCondition = (prevConditions: any, condition: any) => {
			const previous = [...prevConditions];
			if (condition) {
				const deleteId = condition?.id.split('_');
				const index = previous.findIndex(
					x => x.id === (deleteId[1] || condition?.id)
				);
				if (index > -1) {
					previous[index] = condition;
				} else {
					previous.push(condition);
				}
			}

			return previous;
		};
		props.saveTrigger(
			{
				...props.trigger,
				isModified: true,
				conditions: updateCondition(props.trigger.conditions, data)
			},
			true
		);
	};

	const saveCondition = (
		condition: any,
		haptic: boolean,
		goBack: boolean
	) => {
		if (haptic) {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		}
		isModified.current = false;
		props.saveCondition(condition);
		if (goBack) {
			props.navigation.goBack();
		}
	};

	useEffect(() => {
		props.loadCondition(
			props.route.params.condition?.id,
			props.route.params.condition?.triggerId ||
				props.route.params.trigger.id
		);
	}, []);

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
		isModified.current = props.condition?.isModified;
		return () => listenerUnsubscribe();
	}, [props.condition]);

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
									'TriggerConditionGeneralSettingsSection',
									{
										conditionData: props.condition
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
									'TriggerConditionParamSettingsSection',
									{
										conditionData: props.condition
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
	condition: state.trigger_condition.condition,
	trigger: state.cycle_trigger.trigger
});

export default connect(mapStateToProps, {
	saveCondition,
	loadCondition,
	saveTrigger
})(TriggerConditionSettingsScreen);
