import React, {useEffect, useRef} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {
	InputForm,
	SelectColor,
	TextAreaForm
} from '../../../../components/common/FormComponents';
import {AppSwitch} from '../../../../components/common/AppSwitch';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';

import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {ExecutionMode} from '../../../../data/conditionTypes';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {EventArg, NavigationAction} from '@react-navigation/native';

export function CycleGeneralSettingsSection(props: any) {
	// Mode embarqué : rendu inline dans l'écran de réglages du cycle (comme les
	// sections Conditions/Sequences). Les données viennent alors de
	// `props.cycleData` et les modifications sont poussées en direct dans le cycle
	// parent.
	const embedded = !!props.embedded;
	const source = embedded ? props.cycleData : props.route.params?.cycleData;
	const isGroupParam = embedded
		? props.isGroup
		: props.route.params?.isGroup;
	const cycleDataRef = useRef(props.cycleData);
	cycleDataRef.current = props.cycleData;

	const [cycleData, setCycleData] = React.useState(source);
	// Les groups et leurs sous-cycles utilisent la nouvelle palette vive ;
	// les cycles classiques gardent les couleurs d'origine.
	const useGroupColors =
		!!isGroupParam || !!cycleData?.parentCycleId || !!cycleData?.taskId;
	const colorProportion = useGroupColors ? 0 : 0;
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const isGroup = !!isGroupParam || cycleData?.type === 'GROUP';
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

	const executionMode =
		watch('executionMode') ?? ExecutionMode.SEQUENTIAL;

	// Section marquée « not valid » par l'écran parent : on affiche les champs en
	// erreur (comme les conditions). Le mode onChange lève ensuite le rouge dès
	// correction.
	useEffect(() => {
		if (embedded && props.showErrors) trigger();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.showErrors]);

	// Mode embarqué : pousse les champs édités dans le cycle parent (merge pour ne
	// pas écraser sequences/conditions) après chaque changement du formulaire.
	useEffect(() => {
		if (!embedded) return;
		const sub = watch(() => {
			const data = getValues();
			let style = data.style;
			if (typeof style === 'string') style = JSON.parse(style);
			props.updateCycle({
				...cycleDataRef.current,
				name: data.name,
				description: data.description,
				style: style
					? {
							fontColor: style.fontColor,
							iconColor: style.iconColor,
							bgColor: style.bgColor
					  }
					: cycleDataRef.current?.style,
				executionMode: data.executionMode,
				isModified: true
			});
		});
		return () => sub.unsubscribe();
	}, [embedded]);

	const onSubmit = (e: any, data: any) => {
		if (!saveUnchangedData) {
			// Aucune modification : on laisse la navigation se poursuivre.
			props.navigation.dispatch(e.data.action);
			return;
		}
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		let style = data.style;
		if (typeof style === 'string') {
			style = JSON.parse(style);
		}
		props.updateCycle(
			{
				...data,
				style: {
					fontColor: style.fontColor,
					iconColor: style.iconColor,
					bgColor: style.bgColor
				},
				isModified: saveUnchangedData
			},
			() => {
				props.navigation.dispatch(e.data.action);
			}
		);
	};
	const buildBeforeRemoveListener = (
		e: EventArg<'beforeRemove', true, {action: NavigationAction}>,
		onContinue: () => void,
		onDiscard: () => void
	) => {
		const backActions = ['GO_BACK', 'POP', 'POP_TO_TOP'];
		if (!backActions.includes(e.data.action.type)) {
			return;
		}
		e.preventDefault();
		handleSubmit(
			data => {
				onSubmit(e, data);
			},
			_errors => {
				Alert.alert(
					'Discard changes?',
					'Some fields contain invalid or incomplete information. Would you like to discard changes or continue editing?',
					[
						{
							text: 'Continue',
							style: 'cancel',
							onPress: onContinue
						},
						{
							text: 'Discard',
							style: 'destructive',
							onPress: onDiscard
						}
					]
				);
			}
		)();
	};

	useEffect(() => {
		if (embedded) return;
		const subscribe = () => {
			const unsubscribe = props.navigation.addListener(
				'beforeRemove',
				(e: any) =>
					buildBeforeRemoveListener(
						e,
						() => {
							unsubscribe();
							subscribe();
						},
						() => {
							unsubscribe();
							props.navigation.dispatch(
								e.data.action
							);
						}
					)
			);
			return unsubscribe;
		};

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

		const unsubscribe = subscribe();
		return () => unsubscribe();
	}, [saveUnchangedData]);

	// En embarqué, la hauteur n'est pas bornée (dans l'accordéon) : on évite le
	// ScrollView qui s'effondrerait à 0.
	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<View style={BoxFormStyle.boxForm}>
			<Text
				style={{
					color: '#32404e',
					fontSize: 15,
					fontWeight: 'bold',
					marginTop: 5,
					marginBottom: 5
				}}>
				Theme
			</Text>
			<SelectColor
				control={control}
				errors={errors}
				name="style"
				placeholder="Cycle theme*"
				rules={{required: 'Theme is required'}}
				colorProportion={colorProportion}
				style={{...cycleData?.style}}
				onChangeText={value => {
					setCycleData({...cycleData, style: JSON.parse(value)});
					setSaveUnchangedData(true);
				}}
			/>
			<Body {...bodyProps}>
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={25}
					placeholder="Name*"
					rules={{required: 'Name is required'}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
				{isGroup && (
					<View
						style={{
							marginTop: 12,
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between'
						}}>
						<Text
							style={{
								color: '#32404e',
								fontSize: 15,
								fontWeight: 'bold'
							}}>
							Execution (sequential/parallel)
						</Text>
						<View
							style={{
								flexDirection: 'row',
								alignItems: 'center'
							}}>
							
							<AppSwitch
								style={{marginHorizontal: 8}}
								value={executionMode === ExecutionMode.PARALLEL}
								onValueChange={checked => {
									setValue(
										'executionMode',
										checked
											? ExecutionMode.PARALLEL
											: ExecutionMode.SEQUENTIAL
									);
									setSaveUnchangedData(true);
								}}
							/>
						</View>
					</View>
				)}
			</Body>
		</View>
	);
}

export default connect(null, {
	updateCycle
})(CycleGeneralSettingsSection);
