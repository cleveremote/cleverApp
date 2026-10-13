import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../data/cycleTypes';
import {useForm} from 'react-hook-form';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../components/common/useSectionSettingsHeader';
import {updateCondition} from '../../../../module/process/infrasctructure/store/actions/condition';
import {
	InputForm,
	SelectForm
} from '../../../components/common/FormComponents';
import {
	symbolStartOptions,
	symbolEndOptions
} from '../../../data/conditionTypes';
import {AppSwitch} from '../../../components/common/AppSwitch';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';

export function ConditionParamSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.conditionData
		: props.route.params?.conditionData;
	const parentRef = React.useRef(props.conditionData);
	parentRef.current = props.conditionData;

	const defaultValues = {...source};
	const [saveUnchangedData, setSaveUnchangedData] = useState(
		defaultValues.isModified
	);
	const [isSensor, setIsSensor] = useState(
		defaultValues.elementType === 'SENSOR'
	);

	const {
		control,
		handleSubmit,
		setValue,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onChange'});

	// Écran autonome : validation immédiate si ouvert depuis un état « not valid ».
	useValidateOnOpen(props.route, trigger);

	// En mode cycle, l'opérateur est forcément l'égalité : on le fixe et on
	// masque le champ (pas la peine de l'afficher).
	useEffect(() => {
		if (!isSensor) {
			setValue('operator', '=');
		}
	}, [isSensor, setValue]);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data =>
			props.updateCondition({
				...parentRef.current,
				elementType: data.elementType,
				elementId: data.elementId,
				operator: data.operator,
				value: data.value,
				symbolStart: data.symbolStart,
				symbolEnd: data.symbolEnd,
				isModified: true
			})
	});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateCondition({...data, isModified: saveUnchangedData});
		}
	};

	const buildBeforeRemoveListener = (
		e: EventArg<'beforeRemove', true, {action: NavigationAction}>,
		onContinue: () => void,
		onDiscard: () => void
	) => {
		e.preventDefault();
		handleSubmit(
			data => {
				onSubmit(data);
				props.navigation.dispatch(e.data.action);
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

	const getDevices = () => {
		const source = isSensor ? props.sensors : props.cycles;
		return source.map((x: any) => ({
			label: x.name,
			value: x.id
		}));
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						marginBottom: 8
					}}>
					<Text
						style={{
							color: '#32404e',
							fontSize: 15,
							fontWeight: 'bold'
						}}>
						Cycles
					</Text>
					<AppSwitch
						style={{marginHorizontal: 8}}
						value={isSensor}
						onValueChange={checked => {
							setIsSensor(checked);
							setValue('elementType', checked ? 'SENSOR' : 'CYCLE');
							setValue('elementId', '', {shouldValidate: true});
							// Le type de `value` diffère selon le mode (ON/OFF en
							// cycle, flottant en sensor) : on la réinitialise pour ne
							// pas conserver une valeur incompatible. Idem pour
							// l'opérateur (forcé à `=` en cycle, choisi en sensor).
							// `shouldValidate` rejoue la validation `required` tout de
							// suite, comme les autres champs obligatoires.
							setValue('value', '', {shouldValidate: true});
							setValue('operator', checked ? '' : '=', {
								shouldValidate: true
							});
							setSaveUnchangedData(true);
						}}
					/>
					<Text
						style={{
							color: '#32404e',
							fontSize: 15,
							fontWeight: 'bold'
						}}>
						Sensors
					</Text>
				</View>
				<SelectForm
					lstData={getDevices()}
					control={control}
					errors={errors}
					name="elementId"
					placeholder={isSensor ? 'Sensors' : 'Cycles'}
					rules={{required: 'Device is required'}}
					onValueChange={() => {
						setSaveUnchangedData(true);
					}}
				/>
				{isSensor && (
					<SelectForm
						lstData={[
							{label: '<', value: '<'},
							{label: '>', value: '>'},
							{label: '=', value: '=='},
							{label: '<=', value: '<='},
							{label: '>=', value: '>='}
						]}
						control={control}
						errors={errors}
						name="operator"
						placeholder="Operator*"
						rules={{required: 'Operator is required'}}
						onValueChange={() => {
							setSaveUnchangedData(true);
						}}
					/>
				)}
				{isSensor ? (
					<InputForm
						control={control}
						errors={errors}
						name="value"
						placeholder="Value*"
						keyboardType="decimal-pad"
						rules={{
							required: 'Value is required',
							pattern: {
								value: /^-?\d+(\.\d+)?$/,
								message: 'Value must be numeric'
							}
						}}
						onChangeText={() => {
							setSaveUnchangedData(true);
						}}
					/>
				) : (
					<SelectForm
						lstData={[
							{label: 'ON', value: 'ON'},
							{label: 'OFF', value: 'OFF'}
						]}
						control={control}
						errors={errors}
						name="value"
						placeholder="Value*"
						rules={{required: 'Value is required'}}
						onValueChange={() => {
							setSaveUnchangedData(true);
						}}
					/>
				)}
				<SelectForm
					lstData={symbolStartOptions}
					control={control}
					errors={errors}
					name="symbolStart"
					placeholder="Symbol Start"
					onValueChange={() => {
						setSaveUnchangedData(true);
					}}
				/>
				<SelectForm
					lstData={symbolEndOptions}
					control={control}
					errors={errors}
					name="symbolEnd"
					placeholder="Symbol End"
					onValueChange={() => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</Body>
	);
}

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {updateCondition})(
	ConditionParamSettingsSection
);
