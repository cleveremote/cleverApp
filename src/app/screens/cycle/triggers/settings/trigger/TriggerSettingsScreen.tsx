import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {KeyboardAwareScrollView} from '../../../../../components/common/KeyboardAwareScrollView';
import {connect} from 'react-redux';
import {
	DeleteItemMenu,
	MenuAccordion,
	MenuGroup
} from '../../../../../components/common/cycleMenu';
import {
	useSectionSettingsHeader,
	isEmpty,
	useEntityLoaded
} from '../../../../../components/common/useSectionSettingsHeader';
import {faBolt, faCheckDouble} from '@fortawesome/free-solid-svg-icons';
import {
	loadTrigger,
	saveTrigger,
	updateTrigger
} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {saveCycle} from '../../../../../../module/process/infrasctructure/store/actions/cycle';
import ConditionBuilderSection, {
	isConditionIncomplete
} from '../../../conditions/ConditionBuilderSection';
import TriggerGeneralSettingsSection from './TriggerGeneralSettingsSection';
import TriggerExecutionSettingsSection from './TriggerExecutionSettingsSection';
import {generalContainerStyle} from '../../../../../components/common/GeneralSettingsFields';
import i18n from 'i18next';

export function TriggerSettingsScreen(props: any) {
	const isNew = !props.route.params.trigger?.id;
	const triggerRef = useRef(props.trigger);
	triggerRef.current = props.trigger;
	const generalLoaded = useEntityLoaded(
		props.trigger,
		props.route.params.trigger?.id
	);

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
		// Section General toujours visible : pas de rouge à l'entrée en création.
		deferNewValidation: true,
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
				isEmpty(triggerRef.current?.delay),
			conditions: !!triggerRef.current?.conditions?.some(
				(c: any) => !c.delete && isConditionIncomplete(c)
			)
		})
	});

	return (
		<KeyboardAwareScrollView
			style={styles.scroll}
			contentContainerStyle={styles.scrollContent}>
			{/* Général sorti du menu : sans carte blanche, en première position, montée
			    une fois l'entité chargée (le formulaire lit ses valeurs au montage). */}
			{generalLoaded ? (
				<View style={generalContainerStyle}>
					<TriggerGeneralSettingsSection
						embedded
						triggerData={triggerRef.current}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</View>
			) : null}
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={41}
					name={i18n.t('common:sections.execution')}
					icon={faBolt}
					defaultExpanded
					invalid={invalidSections.execution}
					onPress={() => {}}>
					{/* Dépliée par défaut : son formulaire lit ses valeurs au montage,
					    on attend que l'entité soit chargée. */}
					{generalLoaded ? (
						<TriggerExecutionSettingsSection
							embedded
							triggerData={triggerRef.current}
							showErrors={invalidSections.execution}
							navigation={props.navigation}
						/>
					) : null}
				</MenuAccordion>
				<MenuAccordion
					key={51}
					name={i18n.t('common:sections.conditions')}
					icon={faCheckDouble}
					invalid={invalidSections.conditions}
					onPress={() => {}}>
					<ConditionBuilderSection
						conditions={props.trigger?.conditions}
						parentId={props.trigger?.id}
						parentType="TRIGGER"
						showErrors={invalidSections.conditions}
						onChange={(conditions: any[]) =>
							props.updateTrigger({
								...triggerRef.current,
								conditions,
								isModified: true
							})
						}
					/>
				</MenuAccordion>
				<DeleteItemMenu key={61} OnConfirm={_deleteItem} />
			</MenuGroup>
		</KeyboardAwareScrollView>
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
	updateTrigger,
	saveCycle
})(TriggerSettingsScreen);
