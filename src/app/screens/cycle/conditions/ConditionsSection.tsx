import {StyleSheet, TouchableOpacity, View, Text} from 'react-native';
import React, {useCallback, useEffect, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../data/cycleTypes';
import {ConditionParentType, assignConditionOrder} from '../../../data/conditionTypes';
import {elementStack} from '../../../components/cycle/moduleStack';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {
	loadConditions,
	saveConditions
} from '../../../../module/process/infrasctructure/store/actions/condition';
import {updateTrigger} from '../../../../module/process/infrasctructure/store/actions/trigger';
import {updateCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {updateSequence} from '../../../../module/process/infrasctructure/store/actions/sequence';

const PRIMARY_COLOR = '#32404e';
const CARD_BG_COLOR = 'white';
const SHADOW_COLOR = '#000';

// Parent-agnostic conditions list. Works the same way for triggers, cycles and
// sequences: it loads the parent's `conditions` into the shared condition slice,
// and on leave persists them back onto the parent entity (embedded array).
function ConditionsSection(props: any) {
	// Sources depuis des props directes (mode embarqué inline dans un écran de
	// réglages parent) ou depuis les params de route (mode écran autonome).
	const embedded = !!props.embedded;
	const conditionsRef = useRef(props.conditions);
	conditionsRef.current = props.conditions;

	const parentType: ConditionParentType =
		props.parentType ?? props.route.params.parentType;

	const parentRef = useRef(props.parent ?? props.route?.params?.parent);
	parentRef.current = props.parent ?? props.route?.params?.parent;

	// Répercute les conditions (slice partagé) sur l'entité parent pour que
	// l'écran parent les persiste à la sortie. Réutilisé par le beforeRemove du
	// mode écran et par l'effect de synchro du mode embarqué.
	const syncParent = (conditions: any[]) => {
		// On marque le parent `isModified` : son écran de réglages persiste à la
		// sortie via `hasUnsavedChanges`, et on ne peut pas se fier au flag
		// `isModified` des conditions (le box le renvoie et ne le nettoie pas — cf.
		// baseline plus bas). Sans ça une suppression de condition retire l'entrée de
		// la liste mais ne déclenche jamais la sauvegarde du parent (la condition
		// réapparaît au rechargement). Aligné sur la synchro des séquences.
		const parent = {...parentRef.current, conditions, isModified: true};
		if (parentType === 'SEQUENCE') {
			props.updateSequence(parent);
		} else if (parentType === 'CYCLE') {
			props.updateCycle(parent);
		} else {
			props.updateTrigger(parent);
		}
	};

	const updateParentAndLeave = (conditions: any[], action: any) => {
		const parent = {...parentRef.current, conditions, isModified: true};
		if (parentType === 'SEQUENCE') {
			props.updateSequence(parent);
			props.navigation.dispatch(action);
		} else if (parentType === 'CYCLE') {
			props.updateCycle(parent, () =>
				props.navigation.dispatch(action)
			);
		} else {
			props.updateTrigger(parent, () =>
				props.navigation.dispatch(action)
			);
		}
	};

	const checkChanges = (e: any) => {
		const hasModified = !!conditionsRef.current?.some(
			(x: any) => x.isModified
		);
		if (!hasModified && !parentRef.current?.isModified) return;
		if (!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(e.data.action.type))
			return;

		e.preventDefault();

		const ordered = assignConditionOrder(conditionsRef.current ?? []);
		props.saveConditions(ordered, () => {
			updateParentAndLeave(ordered, e.data.action);
		});
	};

	// Mode écran : entête + beforeRemove + chargement au montage.
	useEffect(() => {
		if (embedded) return;
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

		props.loadConditions(parentRef.current);
		return () => listenerUnsubscribe();
	}, []);

	// Mode embarqué : le slice trigger_condition.conditions est partagé entre les
	// parents (cycle/séquence/trigger). Au focus de l'écran parent, on ne recharge
	// QUE si le slice appartient à un autre parent — sinon on écraserait des édits
	// tout juste faits dans l'écran d'édition d'une condition (qui alimente le
	// slice mais pas encore l'entité parent).
	//
	// EXCEPTION au premier focus après un (re)montage : on recharge toujours depuis
	// le parent, même si le slice porte encore le même parentId. Cette section n'est
	// re-montée qu'à une entrée fraîche dans l'écran de réglages (revenir d'un
	// sous-écran d'édition ne la démonte pas, l'écran parent restant sous la pile) ;
	// l'écran parent a alors rechargé son entité pristine (loadCycle/…) — sans ce
	// rechargement, un cycle édité puis « discard » puis rouvert conserverait les
	// conditions fantômes du slice partagé (même parentId → garde franchie).
	const firstFocusRef = useRef(true);
	useFocusEffect(
		useCallback(() => {
			if (!embedded) return;
			if (firstFocusRef.current) {
				// N'armer le one-shot qu'une fois le parent réellement chargé, pour
				// ne pas vider le slice si loadCycle/… n'a pas encore résolu.
				if (!parentRef.current?.id) return;
				firstFocusRef.current = false;
				props.loadConditions(parentRef.current);
				return;
			}
			if (props.conditionsParentId !== parentRef.current?.id) {
				props.loadConditions(parentRef.current);
			}
		}, [props.conditionsParentId])
	);

	// Baseline du contenu des conditions au moment du (re)chargement pour CE
	// parent. On ne peut pas se fier au flag `isModified` des conditions : il
	// persiste (le box renvoie les conditions avec le flag, et il n'est pas nettoyé
	// après sauvegarde). Donc simplement afficher la liste re-verrait des
	// conditions « modifiées » et marquerait le parent à tort. On compare plutôt le
	// contenu à cette baseline pour ne synchroniser que sur un vrai changement
	// utilisateur (ajout / édition / suppression).
	const baselineRef = useRef<string | null>(null);
	// Dernier jeton de rechargement autoritaire observé. Un changement de jeton
	// signale que la liste a été remplacée « proprement » (ex. purge après un save
	// auto de suppression) : on ré-établit alors la baseline sur la nouvelle liste
	// sans la traiter comme une modification utilisateur.
	const prevTokenRef = useRef<number>(props.conditionsToken);

	// Mode embarqué : synchronise les conditions sur l'entité parent (pour que son
	// beforeRemove les persiste) uniquement quand elles diffèrent réellement de la
	// baseline. Garde d'appartenance : ne rien faire si le slice partagé appartient
	// à un autre parent.
	useEffect(() => {
		if (!embedded) return;
		if (props.conditionsParentId !== parentRef.current?.id) {
			// Le slice appartient à un autre parent : on oublie notre baseline pour
			// la ré-établir au prochain (re)chargement qui nous concerne.
			baselineRef.current = null;
			prevTokenRef.current = props.conditionsToken;
			return;
		}
		const snapshot = JSON.stringify(conditionsRef.current ?? []);
		if (prevTokenRef.current !== props.conditionsToken) {
			// Rechargement autoritaire : la liste courante devient la nouvelle
			// baseline, aucune synchro (sinon on re-marquerait le parent modifié).
			prevTokenRef.current = props.conditionsToken;
			baselineRef.current = snapshot;
			return;
		}
		if (baselineRef.current === null) {
			// Premier tick où le slice nous appartient (fraîchement chargé) :
			// on mémorise la baseline sans rien synchroniser.
			baselineRef.current = snapshot;
			return;
		}
		if (snapshot === baselineRef.current) return; // aucun changement réel
		syncParent(assignConditionOrder(conditionsRef.current ?? []));
	}, [props.conditions, props.conditionsParentId, props.conditionsToken]);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{props.conditions.map((element: any) =>
					element.delete
						? null
						: elementStack(
								element,
								(item: any) => {
									props.navigation.navigate(
										'ConditionSettingsStack',
										{
											screen: 'ConditionSettingsScreen',
											params: {
												parentId: parentRef.current.id,
												parentType,
												condition: item
											}
										}
									);
								},
								`condition ${element.name}`,
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
							props.navigation.navigate('ConditionSettingsStack', {
								screen: 'ConditionSettingsScreen',
								params: {
									parentId: parentRef.current.id,
									parentType
								}
							});
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
	conditions: state.trigger_condition.conditions,
	conditionsParentId: state.trigger_condition.conditionsParentId,
	conditionsToken: state.trigger_condition.conditionsToken
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
	updateTrigger,
	updateCycle,
	updateSequence
})(ConditionsSection);
