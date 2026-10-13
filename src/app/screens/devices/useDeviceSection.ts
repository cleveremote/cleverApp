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

// Form + persistence plumbing shared by the master/slave General & Configuration
// sections. Reads the entity from `route.params.deviceData`, and on back-nav
// stages the whole edited entity into the shared device slot via `updateDevice`
// (the parent menu performs the single hard save). `transform` lets a section
// coerce field types (e.g. numeric strings → numbers) before staging.
//
// The beforeRemove listener removes itself before re-dispatching the navigation
// action: `updateDevice` is a synchronous slot update with no callback, so we
// must not depend on one to leave, and unsubscribing first prevents the
// re-dispatched action from being intercepted again (an infinite loop that
// otherwise traps the user on the page).
export function useDeviceSection(
	props: any,
	transform: (data: any) => any = data => data,
	ownedFields?: string[]
) {
	const embedded = !!props.embedded;
	const source = embedded ? props.deviceData : props.route.params?.deviceData;
	const parentRef = useRef(props.deviceData);
	parentRef.current = props.deviceData;

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

	// Mode embarqué : pousse les champs propres dans le device parent (merge).
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
			props.updateDevice({
				...parentRef.current,
				...owned,
				isModified: true
			});
		}
	});

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
				// Nothing edited: let the navigation proceed untouched.
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
						props.updateDevice({
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

	return {control, errors, watch, setValue, markDirty: () => setDirty(true)};
}
