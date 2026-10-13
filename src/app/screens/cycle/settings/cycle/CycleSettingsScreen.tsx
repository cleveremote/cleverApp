import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {isEmpty} from '../../../../components/common/useSectionSettingsHeader';
import {SettingsScrollView} from '../../../../components/common/SettingsScrollView';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../components/common/cycleMenu';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faCheckDouble,
	faGear,
	faLayerGroup,
	faRotateRight,
	faTrafficLight
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../data/cycleTypes';
import {Alert} from 'react-native';
import {
	loadCycle,
	loadGroup,
	loadGroups,
	saveCycle,
	saveGroup
} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {CycleType} from '../../../../data/cycleTypes';
import {NavigationAction} from '@react-navigation/native';
import {isTempId} from '../../../../../services/socket';
import SeqSettingsSection from './CycleSeqSettingsSection';
import ConditionsSection from '../../conditions/ConditionsSection';
import CycleChildrenSettingsSection from './CycleChildrenSettingsSection';
import CycleGeneralSettingsSection from './CycleGeneralSettingsSection';
import CyclePrioritySettingsSection from './CyclePrioritySettingsSection';

type BeforeRemoveEvent = {
	preventDefault: () => void;
	data: {action: NavigationAction};
};

export function CycleSett(props: any) {
	const isGroup = !!props.route.params?.isGroup;
	// The GROUP's Cycles section can push another CycleSettingsMenu (for a child
	// cycle) that reuses the same redux slice (state.root_cycle.cycle). We keep an
	// `entityId` for the entity THIS screen owns and only let `cycleRef` follow the
	// shared slice while it still refers to that entity — otherwise a nested child
	// screen would hijack the parent group's in-memory (unsaved) edits.
	// Flux de création : pas d'`id` en params. Notre `loadCycle`/`loadGroup`
	// s'exécute dans un useEffect (après le premier render), donc au montage le
	// slice partagé contient ENCORE l'entité précédemment créée. On mémorise son
	// id pour ne pas l'adopter comme la nôtre (sinon, ex. : créer un module juste
	// après un cycle reprendrait les infos du cycle).
	const isCreateFlow = props.route.params?.id == null;
	const staleIdOnMount = useRef<string | undefined>(
		isCreateFlow ? props.cycle?.id : undefined
	);
	const entityId = useRef<string | undefined>(props.route.params?.id);
	// Ne pas amorcer cycleRef avec l'entité périmée lors d'un flux de création.
	const cycleRef = useRef(isCreateFlow ? undefined : props.cycle);
	if (props.cycle) {
		if (entityId.current == null) {
			if (props.route.params?.id != null) {
				entityId.current = props.route.params.id;
			} else if (
				isTempId(props.cycle.id) &&
				props.cycle.id !== staleIdOnMount.current
			) {
				// Fraîchement créée par notre loadCycle/loadGroup — on adopte son id.
				entityId.current = props.cycle.id;
			}
		}
		if (props.cycle.id === entityId.current) {
			cycleRef.current = props.cycle;
		}
	}

	// Latest `cycles` slice, read at save time to collect the group's in-memory
	// (soft-saved) child cycles. A ref because they are added after this screen's
	// save effect closes over its props (adding a child changes `cycles`, not our
	// `cycle`).
	const cyclesRef = useRef(props.cycles);
	cyclesRef.current = props.cycles;

	// Intention de sortie déclenchée par les boutons d'entête : 'save' (rond de
	// droite) sauvegarde puis sort, 'cancel' (rond de gauche) demande confirmation,
	// 'delete' persiste la suppression sans validation. null = retour
	// geste/matériel → comportement historique.
	const leaveIntentRef = useRef<'save' | 'cancel' | 'delete' | null>(null);

	// Sections en rouge (« not valid ») au clic Save quand leur formulaire n'est
	// pas conforme, et validation en direct après une première tentative.
	const [invalidSections, setInvalidSections] = useState({
		general: false,
		priority: false
	});
	const attemptedSaveRef = useRef(false);

	// Réplique les règles `required` des sections General et Priority.
	const computeInvalidSections = (c: any) => ({
		general: isEmpty(c?.name) || isEmpty(c?.style),
		priority: !c?.modePriority || c.modePriority.length === 0
	});

	// Validation dès l'accès à l'écran (comme la section Condition General) : on
	// met en évidence les sections invalides immédiatement au chargement puis à
	// chaque édition, pour lever le rouge dès correction — sans attendre un save.
	useEffect(() => {
		attemptedSaveRef.current = true;
		setInvalidSections(computeInvalidSections(cycleRef.current));
	}, [props.cycle]);

	const handleBeforeRemove = (
		e: BeforeRemoveEvent,
		ref: React.MutableRefObject<CycleType>,
		onSave: () => void,
		onDiscard: () => void
	) => {
		const hasModified =
			ref.current?.isModified ||
			ref.current?.sequences?.some(x => !!x.isModified) ||
			(ref.current as any)?.conditions?.some(
				(x: any) => !!x.isModified
			);
		if (!hasModified) return;

		const backActions = ['GO_BACK', 'POP', 'POP_TO_TOP'];
		if (!backActions.includes(e.data.action.type)) {
			return;
		}
		e.preventDefault();
		Alert.alert(
			'Discard changes?',
			'You have unsaved changes. Are you sure to discard them and leave the screen?',
			[
				{
					text: 'save',
					style: 'cancel',
					onPress: () => {
						onSave();
					}
				},
				{
					text: 'Discard',
					style: 'destructive',
					onPress: () => {
						onDiscard();
					}
				}
			]
		);
	};

	const _deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		cycleRef.current = {
			...cycleRef.current,
			delete: true,
			isModified: true
		};
		// Suppression : persister et sortir directement (comme le trigger), sans
		// prompt ni validation.
		leaveIntentRef.current = 'delete';
		props.navigation.goBack();
	};

	useEffect(() => {
		if (isGroup) {
			props.loadGroup(props.route.params?.id);
		} else {
			props.loadCycle(
				props.route.params?.id,
				props.route.params?.parentCycleId,
				props.route.params?.type
			);
		}
	}, []);

	useEffect(() => {
		// `childCycles` are owned by the box (it links children via their
		// `parentCycleId`). Our edited copy may hold a stale list, so re-read the
		// freshest one before saving the group to avoid clobbering associations
		// made since we opened it.
		// Children added before the group existed were soft-saved with the group's
		// temp id as `parentCycleId`. Once the group has a real id, push each to the
		// box with the resolved parent so it links them (skipping any marked for
		// deletion — they never reached the box). Sequential to keep the box calls
		// ordered before the screen leaves.
		const persistPendingChildren = (
			tempGroupId: string | undefined,
			realGroupId: string | undefined,
			after: () => void
		) => {
			const pending = (cyclesRef.current || []).filter(
				(c: any) =>
					c.parentCycleId === tempGroupId &&
					isTempId(c.id) &&
					!c.delete
			);
			let index = 0;
			const saveNext = () => {
				if (index >= pending.length) {
					// The box linked the children to the group server-side but our
					// local `groups` slice still holds the group with the empty
					// `childCycles` from its own save. Reload so the groups list
					// resolves the new children without a manual refresh.
					if (pending.length > 0) props.loadGroups();
					after();
					return;
				}
				const child = pending[index++];
				props.saveCycle(
					{...child, parentCycleId: realGroupId},
					false,
					saveNext
				);
			};
			saveNext();
		};

		const performSave = (after: () => void) => {
			if (isGroup) {
				const freshGroup = (props.groups || []).find(
					(g: any) => g.id === cycleRef.current?.id
				);
				const payload = freshGroup
					? {...cycleRef.current, childCycles: freshGroup.childCycles}
					: cycleRef.current;
				const tempGroupId = cycleRef.current?.id;
				// Save the group first, then push its in-memory children with the
				// real parent id the box assigned.
				props.saveGroup(payload, false, (savedGroup: any) => {
					persistPendingChildren(
						tempGroupId,
						savedGroup?.id ?? tempGroupId,
						after
					);
				});
				return;
			}
			// Child cycle whose parent group is still in memory: soft-save it into
			// the `cycles` slice. It is pushed to the box together with the group
			// (see persistPendingChildren) — parity with a cycle's sequences, which
			// persist with the cycle. Otherwise persist it normally.
			const soft = isTempId(cycleRef.current?.parentCycleId);
			props.saveCycle(cycleRef.current, soft, after);
		};

		const hasUnsavedChanges = () =>
			cycleRef.current?.isModified ||
			cycleRef.current?.sequences?.some((x: any) => !!x.isModified) ||
			(cycleRef.current as any)?.conditions?.some(
				(x: any) => !!x.isModified
			);

		let listenerUnsubscribe = () => {};

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
		// Rien de modifié : l'entête n'affiche qu'un simple bouton retour (ni save
		// ni cancel). Sortie silencieuse, aucun changement à confirmer.
		const leaveWithBack = () => {
			props.navigation.goBack();
		};

		// La suppression d'une condition ou d'une séquence (marquée `delete` par les
		// sections embarquées) ne persiste plus toute seule : elle retire l'élément
		// de la liste et marque le cycle modifié. La persistance au box se fait
		// manuellement via le bouton Save du parent (intent 'save' plus bas).
		// Entête conditionnelle : save/cancel dès qu'il y a des modifications
		// (y compris des suppressions en attente), sinon simple retour.
		const dirty = hasUnsavedChanges();
		props.navigation.setOptions({
			headerLeft: () =>
				dirty
					? navigationHeader(leaveWithCancel, 'times-circle', false)
					: navigationHeader(
							leaveWithBack,
							'arrow-alt-circle-left',
							false
					  ),
			headerRight: () =>
				dirty
					? navigationHeader(leaveWithSave, 'check-circle', false)
					: null
		});

		listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				const intent = leaveIntentRef.current;
				leaveIntentRef.current = null;

				if (intent === 'delete') {
					// Suppression : persister sans validation et sortir.
					e.preventDefault();
					performSave(() => {
						listenerUnsubscribe();
						props.navigation.dispatch(e.data.action);
					});
					return;
				}

				if (intent === 'save') {
					// Valider les sections : celles non conformes passent en rouge
					// et on reste sur l'écran.
					attemptedSaveRef.current = true;
					const invalid = computeInvalidSections(cycleRef.current);
					if (invalid.general || invalid.priority) {
						setInvalidSections(invalid);
						ReactNativeHapticFeedback.trigger(
							'notificationError',
							hapticOptions
						);
						e.preventDefault();
						return;
					}
					setInvalidSections({general: false, priority: false});
					// Rien de modifié : on laisse simplement sortir.
					if (!hasUnsavedChanges()) return;
					e.preventDefault();
					performSave(() => {
						// Le guard voit toujours isModified=true (CYCLE_SAVE met à
						// jour la liste, pas la copie éditée) : on retire le
						// listener avant de renvoyer l'action pour ne pas
						// re-bloquer la sortie.
						listenerUnsubscribe();
						props.navigation.dispatch(e.data.action);
					});
					return;
				}

				if (intent === 'cancel') {
					// Bouton Cancel : proposer de continuer l'édition ou d'abandonner.
					if (!hasUnsavedChanges()) return;
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
							{text: 'Continue', style: 'cancel', onPress: () => {}},
							{
								text: 'Discard',
								style: 'destructive',
								onPress: () => {
									listenerUnsubscribe();
									props.navigation.dispatch(e.data.action);
								}
							}
						]
					);
					return;
				}

				// Retour geste/matériel : confirmation avant abandon (save/discard).
				handleBeforeRemove(
					e,
					cycleRef,
					() => {
						performSave(() => {
							listenerUnsubscribe();
							props.navigation.dispatch(e.data.action);
						});
					},
					() => {
						listenerUnsubscribe();
						props.navigation.dispatch(e.data.action);
					}
				);
			}
		);

		return () => listenerUnsubscribe();
	}, [props.cycle]);

	return (
		<SettingsScrollView>
			<View style={styles.card}>
				<MenuAccordion
					key={21}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					<CycleGeneralSettingsSection
						embedded
						cycleData={cycleRef.current}
						isGroup={isGroup}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<MenuAccordion
					key={41}
					name={'Priority'}
					icon={faTrafficLight}
					invalid={invalidSections.priority}
					onPress={() => {}}>
					<CyclePrioritySettingsSection
						embedded
						cycleData={cycleRef.current}
						showErrors={invalidSections.priority}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<MenuAccordion
					key={31}
					name={'Conditions'}
					icon={faCheckDouble}
					onPress={() => {}}>
					<ConditionsSection
						embedded
						parent={cycleRef.current}
						parentType="CYCLE"
						navigation={props.navigation}
					/>
				</MenuAccordion>
				{isGroup ? (
					<MenuAccordion
						key={51}
						name={'Cycles'}
						icon={faLayerGroup}
						onPress={() => {}}>
						<CycleChildrenSettingsSection
							embedded
							cycleData={cycleRef.current}
							navigation={props.navigation}
						/>
					</MenuAccordion>
				) : (
					<MenuAccordion
						key={51}
						name={'Sequences'}
						icon={faRotateRight}
						onPress={() => {}}>
						<SeqSettingsSection
							embedded
							cycleData={cycleRef.current}
							navigation={props.navigation}
						/>
					</MenuAccordion>
				)}
				{!isCreateFlow && (
					<DeleteItemMenu
						key={61}
						OnConfirm={() => {
							_deleteItem();
						}}
					/>
				)}
			</View>
		</SettingsScrollView>
	);
}

const colors = {
	white: 'white',
	shadow: '#000'
};

const styles = StyleSheet.create({
	container: {
		alignSelf: 'stretch'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: colors.white,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: colors.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	}
});

const mapStateToProps = (state: any) => ({
	cycle: state.root_cycle.cycle,
	groups: state.root_cycle.groups,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {
	loadCycle,
	loadGroup,
	loadGroups,
	saveCycle,
	saveGroup
})(CycleSett);
