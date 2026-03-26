import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
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
	const triggerRef = useRef(props.trigger);
	triggerRef.current = props.trigger;

	const triggersRef = useRef(props.triggers);
	triggersRef.current = props.triggers;

	const checkChanges = (e: any) => {
		const isModified =
			triggerRef.current?.isModified ||
			triggerRef.current?.conditions?.some(
				(x: {isModified: boolean}) => x.isModified
			);

		if (!isModified) return;

		e.preventDefault();

		props.saveTrigger(triggerRef.current, true, () => {
			props.navigation.dispatch(e.data.action);
		});
	};

	const _deleteItem = () => {
		triggerRef.current = {
			...triggerRef.current,
			id: `deleted_${props.trigger.id}`,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadTrigger(
			props.route.params.trigger?.id,
			props.route.params.trigger?.cycleId || props.route.params.cycle.id
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
							'TriggerGeneralSettingsSection',
							{
								triggerData: props.trigger
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
							'TriggerExecutionSettingsSection',
							{
								triggerData: props.trigger
							}
						)
					}
				/>
				<MenuAccordion
					key={51}
					name={'Conditions'}
					icon={faCheckDouble}
					onPress={() =>
						props.navigation.navigate('TriggerConditionsSection', {
							triggerData: props.trigger
						})
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
	trigger: state.cycle_trigger.trigger,
	triggers: state.cycle_trigger.triggers,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	saveTrigger,
	loadTrigger,
	saveCycle
})(TriggerSettingsScreen);
