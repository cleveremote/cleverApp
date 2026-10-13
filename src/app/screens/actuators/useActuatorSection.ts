import {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useForm} from 'react-hook-form';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../data/cycleTypes';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../components/common/useSectionSettingsHeader';

// Form + persistence plumbing shared by the actuator General & Configuration
// sections — transposition de `useDeviceSection` sur le slot `root_actuator`.
// La section lit l'entité dans `actuatorData` (mode embarqué) ou dans
// `route.params.actuatorData` (section ouverte en plein écran) et pousse ses
// champs propres (`ownedFields`) dans le slot via `updateActuator` ; la
// sauvegarde réelle (socket) est faite une seule fois par l'écran parent.
// `transform` permet à une section de coercer ses champs (chaînes -> nombres)
// avant le staging.
export function useActuatorSection(
	props: any,
	transform: (data: any) => any = data => data,
	ownedFields?: string[]
) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.actuatorData
		: props.route.params?.actuatorData;
	const parentRef = useRef(props.actuatorData);
	parentRef.current = props.actuatorData;

	const [dirty, setDirty] = useState(false);
	const defaultValues = {...source};
	const {
		control,
		handleSubmit,
		setValue,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onChange'});

	// Section ouverte depuis un état « not valid » : afficher les champs fautifs.
	useValidateOnOpen(props.route, trigger);

	// Mode embarqué : pousse les champs propres dans l'actuator parent (merge).
	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data => {
			const full = transform(data);
			const owned = ownedFields
				? Object.fromEntries(ownedFields.map(k => [k, full[k]]))
				: full;
			props.updateActuator({
				...parentRef.current,
				...owned,
				isModified: true
			});
		}
	});

	// Mode plein écran : le retour valide puis stage l'entité éditée (voir
	// useDeviceSection — on se désabonne avant de re-dispatcher l'action de
	// navigation pour ne pas boucler dessus).
	useEffect(() => {
		if (embedded) return;
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
			(e: any) => {
				const backActions = ['GO_BACK', 'POP', 'POP_TO_TOP'];
				if (!backActions.includes(e.data.action.type)) return;
				if (!dirty) return;
				e.preventDefault();
				const leave = () => {
					unsubscribe();
					props.navigation.dispatch(e.data.action);
				};
				handleSubmit(
					data => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.updateActuator({
							...transform(data),
							isModified: true
						});
						leave();
					},
					() => {
						Alert.alert(
							'Discard changes?',
							'Some fields contain invalid or incomplete information. Would you like to discard changes or continue editing?',
							[
								{text: 'Continue', style: 'cancel'},
								{
									text: 'Discard',
									style: 'destructive',
									onPress: leave
								}
							]
						);
					}
				)();
			}
		);
		return unsubscribe;
	}, [dirty]);

	return {
		control,
		errors,
		watch,
		setValue,
		getValues,
		markDirty: () => setDirty(true)
	};
}
