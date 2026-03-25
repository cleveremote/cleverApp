import {useEffect, useRef} from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../../components/common/cycleMenu';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faBolt, faCheckDouble, faGear} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {
	loadTrigger,
	saveTrigger
} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {saveCycle} from '../../../../../../module/process/infrasctructure/store/actions/cycle';

export function TriggerSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.item?.id);
	const triggerRef = useRef(props.trigger);
	triggerRef.current = props.trigger;

	const updateTrigger = (prevTriggers: any, trigger: any) => {
		const previous = [...prevTriggers];
		if (trigger) {
			const deleteId = trigger?.id.split('_');
			const index = previous.findIndex(
				x => x.id === (deleteId[1] || trigger?.id)
			);
			if (index > -1) {
				previous[index] = trigger;
			} else {
				previous.push(trigger);
			}
		}
		return previous;
	};

	const checkChanges = (e: any) => {
		if (!isModified.current && !triggerRef.current?.isModified) {
			return;
		}
		saveTrigger(triggerRef.current, true, false);
	};

	const saveTrigger = (trigger: any, haptic: boolean, goBack: boolean) => {
		if (haptic) {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		}
		isModified.current = false;
		props.saveTrigger(trigger);
		if (goBack) {
			props.navigation.goBack();
		}
	};

	const _deleteItem = () => {
		const data = {...triggerRef.current, id: `deleted_${props.trigger.id}`};
		saveTrigger(data, false, true);
		props.saveCycle(
			{
				...props.route.params.cycle,
				triggers: updateTrigger(
					props.route.params.cycle.triggers || [],
					data
				)
			},
			true
		);
	};

	useEffect(() => {
		props.loadTrigger(
			props.route.params.trigger?.id,
			props.route.params.trigger?.cycleId || props.route.params.cycle.id
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
		isModified.current = props.sequence?.isModified;
		return () => listenerUnsubscribe();
	}, [props.trigger]);

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
									'TriggerGeneralSettingsSection',
									{
										triggerData: props.trigger
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
									'TriggerExecutionSettingsSection',
									{
										triggerData: props.trigger
									}
								);
							}}
						/>

						<MenuAccordion
							key={51}
							name={'Conditions'}
							icon={faCheckDouble}
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								props.navigation.navigate(
									'TriggerConditionsSection',
									{
										triggerData: props.trigger
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
	trigger: state.cycle_trigger.trigger
});

export default connect(mapStateToProps, {
	saveTrigger,
	loadTrigger,
	saveCycle
})(TriggerSettingsScreen);
