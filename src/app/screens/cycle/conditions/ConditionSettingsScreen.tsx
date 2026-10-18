import React, {useEffect, useRef, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../components/common/cycleMenu';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faBolt, faGear} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../data/cycleTypes';
import {
	loadCondition,
	saveCondition
} from '../../../../module/process/infrasctructure/store/actions/condition';
import ConditionGeneralSettingsSection from './ConditionGeneralSettingsSection';
import ConditionParamSettingsSection from './ConditionParamSettingsSection';

function ConditionSettingsScreen(props: any) {
	// Pas d'`id` en params = création → le rond de droite affiche un « + » (Add).
	const isNew = !props.route.params.condition?.id;
	const isModified = useRef(!props.route.params.condition?.id);
	isModified.current = props.condition?.isModified;

	const conditionRef = useRef(props.condition);
	conditionRef.current = props.condition;

	// Intention de sortie déclenchée par les boutons d'entête (voir plus bas).
	const leaveIntentRef = useRef<'save' | 'cancel' | null>(null);

	// Sections encadrées en rouge au clic Add/Save quand leur sous-formulaire
	// n'est pas conforme. On revalide en direct une fois une tentative faite.
	const [invalidSections, setInvalidSections] = useState({
		general: false,
		execution: false
	});
	const attemptedSaveRef = useRef(false);

	// Réplique les règles `required` des sous-formulaires (ces écrans ne sont pas
	// montés, on valide donc les données de la condition centralement) :
	//  - General  → `name`
	//  - Execution → `elementId`, `operator`, `value`
	const isEmpty = (v: any) => v === undefined || v === null || v === '';
	const computeInvalidSections = (c: any) => ({
		general: isEmpty(c?.name),
		execution:
			isEmpty(c?.elementId) ||
			isEmpty(c?.operator) ||
			isEmpty(c?.value)
	});

	// Validation dès l'accès au screen : on met en évidence les champs invalides
	// immédiatement (au chargement de la condition) puis à chaque édition (retour
	// d'un sous-écran) pour lever le cadre dès correction.
	useEffect(() => {
		attemptedSaveRef.current = true;
		setInvalidSections(computeInvalidSections(conditionRef.current));
	}, [props.condition]);

	const _deleteItem = () => {
		// Suppression directe, alignée sur les séquences : on dispatche tout de
		// suite la condition marquée `delete` dans le slice partagé, puis on
		// revient. La section embarquée ConditionsSection répercute la suppression
		// sur le parent (cycle/séquence/trigger) — qu'elle marque `isModified` —
		// dont l'écran de réglages déclenche le save auto (saveCycle) puis purge la
		// liste. On ne dépend donc plus du beforeRemove pour persister : on neutralise
		// `isModified` (local + condition) pour que le listener laisse simplement
		// sortir sans re-sauvegarder.
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		isModified.current = false;
		conditionRef.current = {
			...conditionRef.current,
			delete: true,
			isModified: false
		};
		props.saveCondition(conditionRef.current, true, () => {
			props.navigation.goBack();
		});
	};

	// Entête conditionnelle réactive : save/cancel seulement s'il y a une
	// modification, sinon un simple bouton retour à la place du cancel. Effet dédié
	// (deps [props.condition]) car l'effet principal ne tourne qu'au montage pour ne
	// pas relancer loadCondition et écraser les édits en cours.
	useEffect(() => {
		const leaveWithSave = () => {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			leaveIntentRef.current = 'save';
			props.navigation.goBack();
		};
		const leaveWithCancel = () => {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			leaveIntentRef.current = 'cancel';
			props.navigation.goBack();
		};
		const leaveWithBack = () => {
			props.navigation.goBack();
		};
		const dirty = isNew || !!conditionRef.current?.isModified;
		const headerRight = () => {
			if (isNew) {
				return navigationHeader(leaveWithSave, 'times-circle', true);
			}
			return dirty
				? navigationHeader(leaveWithSave, 'check-circle', false)
				: null;
		};
		props.navigation.setOptions({
			headerLeft: () =>
				dirty
					? navigationHeader(leaveWithCancel, 'times-circle', false)
					: navigationHeader(
							leaveWithBack,
							'arrow-alt-circle-left',
							false
					  ),
			headerRight
		});
	}, [props.condition]);

	useEffect(() => {
		props.loadCondition(
			props.route.params.condition?.id,
			props.route.params.condition?.parentId ||
				props.route.params.parentId,
			props.route.params.condition?.parentType ||
				props.route.params.parentType
		);

		let unsubscribe = () => {};
		const saveAndLeave = (action: any) => {
			props.saveCondition(conditionRef.current, true, () => {
				unsubscribe();
				props.navigation.dispatch(action);
			});
		};
		unsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				const intent = leaveIntentRef.current;
				leaveIntentRef.current = null;
				const modified =
					isModified.current || conditionRef.current?.isModified;

				if (intent === 'save') {
					// Valider tous les sous-formulaires avant de sortir. Si une
					// section n'est pas conforme, on l'encadre en rouge et on
					// reste sur l'écran.
					attemptedSaveRef.current = true;
					const invalid = computeInvalidSections(conditionRef.current);
					if (invalid.general || invalid.execution) {
						setInvalidSections(invalid);
						ReactNativeHapticFeedback.trigger(
							'notificationError',
							hapticOptions
						);
						e.preventDefault();
						return;
					}
					setInvalidSections({general: false, execution: false});
					if (!modified) return;
					e.preventDefault();
					saveAndLeave(e.data.action);
					return;
				}
				if (intent === 'cancel') {
					if (!modified) return;
					if (
						!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(
							e.data.action.type
						)
					)
						return;
					e.preventDefault();
					Alert.alert(
						'Discard changes?',
						'You have unsaved changes. Would you like to continue editing or discard them?',
						[
							{
								text: 'Continue',
								style: 'cancel',
								onPress: () => {}
							},
							{
								text: 'Discard',
								style: 'destructive',
								onPress: () => {
									unsubscribe();
									props.navigation.dispatch(e.data.action);
								}
							}
						]
					);
					return;
				}
				// Retour geste/matériel ou suppression : sauvegarde silencieuse
				// (comportement historique).
				if (!modified) return;
				e.preventDefault();
				saveAndLeave(e.data.action);
			}
		);
		return unsubscribe;
	}, []);

	return (
		<SettingsScrollView>
			<View style={styles.card}>
				<MenuAccordion
					key={21}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					<ConditionGeneralSettingsSection
						embedded
						conditionData={conditionRef.current}
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
					<ConditionParamSettingsSection
						embedded
						conditionData={conditionRef.current}
						showErrors={invalidSections.execution}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				{!isNew && (
					<DeleteItemMenu
						key={61}
						name="Remove" 
						confirmTitle="Remove condition"
						confirmMessage="Are you sure you want to remove this condition from the list?"
						OnConfirm={_deleteItem}
					/>
				)}
			</View>
		</SettingsScrollView>
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
	conditions: state.trigger_condition.conditions
});

export default connect(mapStateToProps, {
	saveCondition,
	loadCondition
})(ConditionSettingsScreen);
