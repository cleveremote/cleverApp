import {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {navigationHeader} from './navigationHeaders';
import {hapticOptions} from '../../data/cycleTypes';

export type InvalidSections = Record<string, boolean>;

// Champ « requis » considéré non renseigné.
export const isEmpty = (v: any) => v === undefined || v === null || v === '';

// Logique commune des écrans de réglages à sections (MenuAccordion) :
//  - rond de droite : « + » (Add, comme « add new … ») en création, « save »
//    (check) en modification → sauvegarde puis sortie.
//  - rond de gauche : « cancel » (times) → propose Continue / Discard.
//  - au clic Add/Save : validation de tous les sous-formulaires ; les sections
//    non conformes passent en rouge (« not valid ») et on reste sur l'écran.
//  - retour geste/matériel : sauvegarde silencieuse (comportement historique).
//
// Le hook ne connaît pas le détail des entités : l'écran fournit `hasChanges`,
// `save` (persiste puis appelle `onDone`) et un `validate` optionnel renvoyant la
// map des sections invalides. `entity` sert de dépendance de re-render.
export function useSectionSettingsHeader({
	navigation,
	entity,
	isNew,
	hasChanges,
	save,
	validate,
	backWhenPristine,
	discard
}: {
	navigation: any;
	entity: any;
	isNew: boolean;
	hasChanges: () => boolean;
	save: (onDone: () => void) => void;
	validate?: () => InvalidSections;
	// Appelé quand l'utilisateur confirme « Discard » : permet à l'écran de
	// remettre son slice redux dans l'état d'origine (utile pour les listes, dont
	// les éléments sont mis en attente dans le store par les sous-écrans).
	discard?: () => void;
	// En modification, tant qu'aucun changement n'a été fait, n'afficher qu'un
	// simple bouton retour (ni save ni cancel). Les boutons save/cancel
	// réapparaissent dès la première édition (l'entité redux devient modifiée,
	// ce qui relance cet effet).
	backWhenPristine?: boolean;
}): {invalidSections: InvalidSections} {
	const leaveIntentRef = useRef<'save' | 'cancel' | null>(null);
	const [invalidSections, setInvalidSections] = useState<InvalidSections>({});
	const attemptedSaveRef = useRef(false);

	// Whether there is anything to save right now. Recomputed every render so the
	// header effect below re-runs (and re-draws save/cancel vs. a plain back
	// button) when dirtiness changes without the `entity` slot itself changing —
	// e.g. a master whose only change is a nested slave that just soft-saved.
	const dirty = hasChanges();

	const anyInvalid = (m: InvalidSections) => Object.values(m).some(Boolean);

	// Validation dès l'accès à l'écran (comme la section Condition General) : on
	// met en évidence les sections invalides immédiatement au chargement de
	// l'entité, puis à chaque édition (retour d'un sous-écran ou saisie inline)
	// pour lever le cadre dès correction — sans attendre une tentative de save.
	useEffect(() => {
		if (validate) {
			attemptedSaveRef.current = true;
			setInvalidSections(validate());
		}
	}, [entity]);

	useEffect(() => {
		const leaveWithSave = () => {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			leaveIntentRef.current = 'save';
			navigation.goBack();
		};
		const leaveWithCancel = () => {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			leaveIntentRef.current = 'cancel';
			navigation.goBack();
		};

		const leaveWithBack = () => {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
			navigation.goBack();
		};

		if (backWhenPristine && !isNew && !hasChanges()) {
			navigation.setOptions({
				headerLeft: () =>
					navigationHeader(
						leaveWithBack,
						'arrow-alt-circle-left',
						false
					),
				headerRight: () => null
			});
		} else {
			navigation.setOptions({
				headerLeft: () =>
					navigationHeader(leaveWithCancel, 'times-circle', false),
				headerRight: () =>
					isNew
						? navigationHeader(leaveWithSave, 'times-circle', true)
						: navigationHeader(leaveWithSave, 'check-circle', false)
			});
		}

		let unsubscribe = () => {};
		unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
			const intent = leaveIntentRef.current;
			leaveIntentRef.current = null;

			if (intent === 'save') {
				// Valider tous les sous-formulaires avant de sortir. Si une
				// section n'est pas conforme, on l'encadre en rouge (via la map
				// retournée) et on reste sur l'écran.
				if (validate) {
					attemptedSaveRef.current = true;
					const invalid = validate();
					if (anyInvalid(invalid)) {
						setInvalidSections(invalid);
						ReactNativeHapticFeedback.trigger(
							'notificationError',
							hapticOptions
						);
						e.preventDefault();
						return;
					}
					setInvalidSections({});
				}
				if (!hasChanges()) return; // rien à sauver → sortie directe
				e.preventDefault();
				save(() => {
					unsubscribe();
					navigation.dispatch(e.data.action);
				});
				return;
			}

			if (intent === 'cancel') {
				if (!hasChanges()) return;
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
								discard?.();
								unsubscribe();
								navigation.dispatch(e.data.action);
							}
						}
					]
				);
				return;
			}

			// Retour geste/matériel ou suppression : sauvegarde silencieuse
			// (comportement historique).
			if (!hasChanges()) return;
			e.preventDefault();
			save(() => {
				unsubscribe();
				navigation.dispatch(e.data.action);
			});
		});
		return () => unsubscribe();
	}, [entity, dirty]);

	return {invalidSections};
}

// Petit utilitaire pour les sous-formulaires : quand la section a été ouverte
// depuis un état « not valid » (param de navigation `showErrors`), on déclenche
// la validation react-hook-form au montage pour afficher les champs fautifs.
export function useValidateOnOpen(route: any, trigger: () => void) {
	useEffect(() => {
		if (route?.params?.showErrors) {
			trigger();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}

// Câblage commun d'une section-formulaire rendue INLINE (embarquée) dans l'écran
// de réglages de son élément (comme Cycle General/Priority) :
//  - `showErrors` (prop passée par le parent quand la section est « not valid »)
//    déclenche la validation pour afficher les champs en rouge ; le mode
//    `onChange` du formulaire lève ensuite le rouge dès correction.
//  - à chaque changement du formulaire, `stage(values)` pousse les champs édités
//    dans l'entité parent (merge, pour ne pas écraser les autres sections).
export function useEmbeddedSection({
	embedded,
	showErrors,
	trigger,
	watch,
	getValues,
	stage
}: {
	embedded: boolean;
	showErrors?: boolean;
	trigger: () => void;
	watch: (
		cb: (values: any, info: any) => void
	) => {unsubscribe: () => void};
	getValues: () => any;
	stage: (values: any) => void;
}) {
	useEffect(() => {
		if (embedded && showErrors) trigger();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showErrors]);

	useEffect(() => {
		if (!embedded) return;
		// `watch(callback)` ne se déclenche pas au montage, seulement sur les
		// changements suivants (saisie utilisateur ou setValue), ce qui suffit
		// pour ne stager qu'après une interaction réelle.
		const sub = watch(() => stage(getValues()));
		return () => sub.unsubscribe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [embedded]);
}
