import React, {useEffect, useRef} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../../components/common/cycleMenu';
import {
	useSectionSettingsHeader,
	isEmpty
} from '../../../../../components/common/useSectionSettingsHeader';
import {faBolt, faCheckDouble, faGear} from '@fortawesome/free-solid-svg-icons';
import {
	loadTrigger,
	saveTrigger
} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {saveCycle} from '../../../../../../module/process/infrasctructure/store/actions/cycle';
import ConditionsSection from '../../../conditions/ConditionsSection';
import TriggerGeneralSettingsSection from './TriggerGeneralSettingsSection';
import TriggerExecutionSettingsSection from './TriggerExecutionSettingsSection';

export function TriggerSettingsScreen(props: any) {
	const isNew = !props.route.params.trigger?.id;
	const triggerRef = useRef(props.trigger);
	triggerRef.current = props.trigger;

	const triggersRef = useRef(props.triggers);
	triggersRef.current = props.triggers;

	const _deleteItem = () => {
		triggerRef.current = {
			...triggerRef.current,
			delete: true,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadTrigger(
			props.route.params.trigger?.id,
			props.route.params.trigger?.cycleId || props.route.params.cycle.id
		);
	}, []);

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.trigger,
		isNew,
		hasChanges: () =>
			triggerRef.current?.isModified ||
			triggerRef.current?.conditions?.some(
				(x: {isModified: boolean}) => x.isModified
			),
		save: onDone => props.saveTrigger(triggerRef.current, true, onDone),
		// Requis inconditionnels par section (les champs conditionnels restent
		// gardés par le sous-formulaire lui-même).
		validate: () => ({
			general: isEmpty(triggerRef.current?.name),
			execution:
				isEmpty(triggerRef.current?.action) ||
				isEmpty(triggerRef.current?.delay)
		})
	});

	return (
		<ScrollView
			style={styles.scroll}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="handled">
			<View style={styles.card}>
				<MenuAccordion
					key={21}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					<TriggerGeneralSettingsSection
						embedded
						triggerData={triggerRef.current}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<MenuAccordion
					key={41}
					name={'Execution'}
					icon={faBolt}
					invalid={invalidSections.execution}
					onPress={() => {}}>
					<TriggerExecutionSettingsSection
						embedded
						triggerData={triggerRef.current}
						showErrors={invalidSections.execution}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<MenuAccordion
					key={51}
					name={'Conditions'}
					icon={faCheckDouble}
					onPress={() => {}}>
					<ConditionsSection
						embedded
						parent={props.trigger}
						parentType="TRIGGER"
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<DeleteItemMenu key={61} OnConfirm={_deleteItem} />
			</View>
		</ScrollView>
	);
}

const COLORS = {
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	scroll: {
		flex: 1
	},
	scrollContent: {
		paddingBottom: 24
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
