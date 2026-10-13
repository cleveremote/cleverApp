import {useEffect, useRef, useState} from 'react';
import {Alert} from 'react-native';
import {useForm} from 'react-hook-form';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../data/cycleTypes';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../components/common/useSectionSettingsHeader';

// Form plumbing for the COM request General / Configuration sections. A COM
// request is a standalone modbusTask; edits are staged into the shared task slot
// via `updateModbusTask` and the COM request menu performs the single hard save.
// `transform` lets a section coerce field types before staging. See
// useDeviceSection for the unsubscribe-before-dispatch beforeRemove rationale.
export function useComRequestSection(
	props: any,
	transform: (data: any) => any = data => data,
	ownedFields?: string[]
) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.comRequestData
		: props.route.params?.comRequestData;
	const parentRef = useRef(props.comRequestData);
	parentRef.current = props.comRequestData;

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

	// Mode embarqué : pousse les champs propres dans le modbusTask parent (merge).
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
			props.updateModbusTask({
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
						props.updateModbusTask({
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
