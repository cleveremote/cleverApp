import React, {useEffect, useRef, useState} from 'react';
import {Alert, View} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {
	DeleteItemMenu,
	MenuAccordion,
	MenuGroup
} from '../../../../components/common/cycleMenu';
import {isEmpty, useEntityLoaded} from '../../../../components/common/useSectionSettingsHeader';
import {SettingsScrollView} from '../../../../components/common/SettingsScrollView';
import SequenceGeneralSettingsSection from './SequenceGeneralSettingsSection';
import SequenceSecuritySettingsSection, {
	isInverterDirectiveInvalid
} from './SequenceSecuritySettingsSection';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faCheckDouble,
	faEthernet,
	faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../data/cycleTypes';
import {
	loadSequence,
	saveSequence,
	updateSequence
} from '../../../../../module/process/infrasctructure/store/actions/sequence';
import ConditionBuilderSection, {
	isConditionIncomplete
} from '../../conditions/ConditionBuilderSection';
import SequenceActuatorsSettingsSection from './SequenceActuatorsSettingsSection';
import {generalContainerStyle} from '../../../../components/common/GeneralSettingsFields';
import i18n from 'i18next';

function SequenceSettingsScreen(props: any) {
	// Pas d'`id` en params = création → le rond de droite affiche un « + » (Add).
	const isNew = !props.route.params.item?.id;
	const isModified = useRef(!props.route.params.item?.id);
	const sequenceRef = useRef(props.sequence);
	sequenceRef.current = props.sequence;
	const generalLoaded = useEntityLoaded(
		props.sequence,
		props.route.params.item?.id
	);
	// Séquence d'un MODULE : on ne peut ni la supprimer ni retirer ses
	// actionneurs déjà définis (seulement en ajouter). Le cycle parent est celui
	// ouvert dans CycleSettingsScreen (slice partagé), vérifié par son id.
	const isModule =
		props.cycle?.id === props.route.params?.cycleId &&
		props.cycle?.type === 'MODULE';

	// Intention de sortie déclenchée par les boutons d'entête (voir plus bas).
	const leaveIntentRef = useRef<'save' | 'cancel' | null>(null);

	// Sections en rouge au clic Save si non conformes (comme les conditions).
	const [invalidSections, setInvalidSections] = useState({
		general: false,
		security: false,
		conditions: false
	});
	const attemptedSaveRef = useRef(false);
	const computeInvalidSections = (s: any) => ({
		general: isEmpty(s?.name),
		security:
			isEmpty(s?.securityConfig?.maxDuration) ||
			!!s?.inverterDirectives?.some(isInverterDirectiveInvalid),
		conditions: !!s?.conditions?.some(
			(x: any) => !x.delete && isConditionIncomplete(x)
		)
	});

	// Validation dès l'accès à l'écran (comme la section Condition General) :
	// sections invalides mises en évidence immédiatement puis à chaque édition,
	// sans attendre une tentative de save.
	// En création, la section General (toujours visible) est vide à l'entrée :
	// pas de rouge avant la première tentative de save.
	useEffect(() => {
		if (isNew && !attemptedSaveRef.current) return;
		attemptedSaveRef.current = true;
		setInvalidSections(computeInvalidSections(sequenceRef.current));
	}, [props.sequence]);

	const hasUnsavedChanges = () => {
		const conditionsModified = sequenceRef.current?.conditions?.some(
			(x: any) => !!x.isModified
		);
		return (
			isModified.current ||
			sequenceRef.current?.isModified ||
			conditionsModified
		);
	};

	const persistSequence = () => {
		isModified.current = false;
		props.saveSequence(sequenceRef.current);
	};

	const _deleteItem = () => {
		// Marque la séquence supprimée dans le slice puis revient au cycle : la
		// section embarquée répercute la suppression sur le cycle, dont l'écran de
		// réglages déclenche le save auto (persistance box) puis purge la liste —
		// cf. le watcher de CycleSettingsScreen. On ne persiste donc plus le cycle
		// ici (sinon double sauvegarde).
		saveSequence({...props.sequence, delete: true}, false, true);
	};

	const saveSequence = (sequence: any, haptic: boolean, goBack: boolean) => {
		if (haptic) {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		}
		isModified.current = false;
		props.saveSequence(sequence);
		if (goBack) {
			props.navigation.goBack();
		}
	};

	useEffect(() => {
		props.loadSequence(props.route.params.item?.id);
	}, []);

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
		// Rien de modifié : simple bouton retour (ni save ni cancel).
		const leaveWithBack = () => {
			props.navigation.goBack();
		};

		// Entête conditionnelle : save/cancel seulement s'il y a des modifications,
		// sinon un simple bouton retour à la place du cancel.
		const dirty = hasUnsavedChanges();
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

		let listenerUnsubscribe = () => {};
		listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				const intent = leaveIntentRef.current;
				leaveIntentRef.current = null;
				const modified = hasUnsavedChanges();

				if (intent === 'save') {
					attemptedSaveRef.current = true;
					const invalid = computeInvalidSections(
						sequenceRef.current
					);
					if (invalid.general || invalid.security || invalid.conditions) {
						setInvalidSections(invalid);
						ReactNativeHapticFeedback.trigger(
							'notificationError',
							hapticOptions
						);
						e.preventDefault();
						return;
					}
					setInvalidSections({
						general: false,
						security: false,
						conditions: false
					});
					if (modified) persistSequence();
					return; // laisse la navigation se poursuivre
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
						i18n.t('common:discard.title'),
						i18n.t('common:discard.message'),
						[
							{
								text: i18n.t('common:discard.continue'),
								style: 'cancel',
								onPress: () => {}
							},
							{
								text: i18n.t('common:discard.confirm'),
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
				// Retour geste/matériel ou suppression : sauvegarde silencieuse
				// (comportement historique).
				if (modified) persistSequence();
			}
		);
		isModified.current = props.sequence?.isModified;
		return () => listenerUnsubscribe();
	}, [props.sequence]);

	return (
		<SettingsScrollView>
			{/* Général sorti du menu : sans carte blanche, en première position, montée
			    une fois l'entité chargée (le formulaire lit ses valeurs au montage). */}
			{generalLoaded ? (
				<View style={generalContainerStyle}>
					<SequenceGeneralSettingsSection
						embedded
						sequenceData={sequenceRef.current}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</View>
			) : null}
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: 'white',
					marginTop: 8,
					marginHorizontal: 20,
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22
				}}>
				<View>
					<MenuGroup>
						<MenuAccordion
							key={41}
							name={i18n.t('common:sections.security')}
							icon={faShieldHalved}
							invalid={invalidSections.security}
							onPress={() => {}}>
							<SequenceSecuritySettingsSection
								embedded
								sequenceData={sequenceRef.current}
								showErrors={invalidSections.security}
								navigation={props.navigation}
							/>
						</MenuAccordion>

						<MenuAccordion
							key={55}
							name={i18n.t('common:sections.conditions')}
							icon={faCheckDouble}
							invalid={invalidSections.conditions}
							onPress={() => {}}>
							<ConditionBuilderSection
								conditions={props.sequence?.conditions}
								parentId={props.sequence?.id}
								parentType="SEQUENCE"
								showErrors={invalidSections.conditions}
								onChange={(conditions: any[]) =>
									props.updateSequence({
										...sequenceRef.current,
										conditions,
										isModified: true
									})
								}
							/>
						</MenuAccordion>

						<MenuAccordion
							key={51}
							name={i18n.t('common:sections.actuators')}
							icon={faEthernet}
							onPress={() => {}}>
							<SequenceActuatorsSettingsSection
								embedded
								sequenceData={sequenceRef.current}
								isModule={isModule}
								navigation={props.navigation}
							/>
						</MenuAccordion>

						{!isNew && !isModule && (
							<DeleteItemMenu
								key={61}
								name={i18n.t('common:remove')}
								confirmTitle={i18n.t('cycle:sequence.removeTitle')}
								confirmMessage={i18n.t('cycle:sequence.removeMessage')}
								OnConfirm={() => {
									_deleteItem();
								}}
							/>
						)}
					</MenuGroup>
				</View>
			</View>
		</SettingsScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	sequence: state.cycle_sequence.sequence,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	saveSequence,
	loadSequence,
	updateSequence
})(SequenceSettingsScreen);
