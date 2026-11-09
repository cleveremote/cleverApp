import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fieldLabelColor } from '../../../../styles/components/common/Input';
import { navigationHeader } from '../../../../components/common/navigationHeaders';
import { useFieldArray, useForm } from 'react-hook-form';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBolt, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
	DateTimePickerForm,
	InputForm,
	SelectForm
} from '../../../../components/common/FormComponents';
import { CollapsibleSection } from '../../../../components/common/CollapsibleSection';
import { BoxFormStyle } from '../../../../styles/components/common/boxForm';
import { connect } from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { hapticOptions } from '../../../../data/cycleTypes';
import {
	isEmpty,
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../../components/common/useSectionSettingsHeader';
import { updateSequence } from '../../../../../module/process/infrasctructure/store/actions/sequence';
import i18n from 'i18next';
import {
	durationToPickerDate,
	pickerDateToDuration
} from '../../../../../services/time';

// Pilotage d'un variateur par la séquence (`inverterDirectives`, DTO
// SequenceInverterDirectiveSync) :
//  - PID   : PID interne du variateur (capteur AI1), consigne F11.01
//            (`pidSetpoint`, optionnelle) ;
//  - RS485 : consigne de fréquence écrite par la box (0x2000), `frequency`
//            obligatoire.
export enum InverterMode {
	PID = 'PID',
	RS485 = 'RS485'
}

const INVERTER_MODES = [
	{ label: 'PID', value: InverterMode.PID },
	{ label: 'RS485', value: InverterMode.RS485 }
];

const isInverterMode = (mode: any) =>
	Object.values(InverterMode).includes(mode);

// Saisie numérique (virgule acceptée). Non numérique : valeur brute conservée
// pour que la validation la signale au lieu de la perdre.
const toNumber = (value: any) => {
	if (isEmpty(value)) return undefined;
	const n = Number(`${value}`.replace(',', '.'));
	return Number.isFinite(n) ? n : value;
};

const numberRule = (value: any) =>
	isEmpty(value) ||
	typeof toNumber(value) === 'number' ||
	i18n.t('cycle:sequence.inverter.invalidNumber');

// Directives du formulaire → forme attendue par la box : seuls les champs du
// mode choisi sont envoyés.
export const toInverterDirectives = (directives: any[]) =>
	(directives ?? []).map((d: any) => {
		const pidSetpoint = toNumber(d.pidSetpoint);
		return {
			inverterId: `${d.inverterId}`,
			mode: d.mode,
			...(d.mode === InverterMode.RS485
				? { frequency: toNumber(d.frequency) }
				: {}),
			...(d.mode === InverterMode.PID && pidSetpoint !== undefined
				? { pidSetpoint }
				: {})
		};
	});

// Directive non conforme au DTO (section Security en rouge au save).
export const isInverterDirectiveInvalid = (d: any) =>
	isEmpty(d?.inverterId) ||
	!isInverterMode(d?.mode) ||
	(d.mode === InverterMode.RS485 && typeof d.frequency !== 'number') ||
	(d.pidSetpoint !== undefined && typeof d.pidSetpoint !== 'number');

export function SequenceSecuritySettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.sequenceData
		: props.route.params?.sequenceData;
	const parentRef = React.useRef(props.sequenceData);
	parentRef.current = props.sequenceData;

	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const isSavingRef = React.useRef(false);

	const defaultValues = {
		...source,
		securityConfig: {
			...source?.securityConfig,
			maxDuration: durationToPickerDate(source?.securityConfig?.maxDuration)
		},
		inverterDirectives: source?.inverterDirectives ?? []
	};
	const {
		control,
		handleSubmit,
		watch,
		getValues,
		setValue,
		trigger,
		formState: { errors }
	} = useForm<any>({ defaultValues, mode: 'onChange' });
	const {
		fields: directiveFields,
		append: appendDirective,
		remove: removeDirective
	} = useFieldArray({ control, name: 'inverterDirectives' });
	const directives = watch('inverterDirectives') ?? [];

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data =>
			props.updateSequence({
				...parentRef.current,
				securityConfig: {
					maxDuration: pickerDateToDuration(data.securityConfig?.maxDuration)
				},
				inverterDirectives: toInverterDirectives(data.inverterDirectives),
				isModified: true
			})
	});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateSequence({
				...data,
				securityConfig: {
					maxDuration: pickerDateToDuration(data.securityConfig.maxDuration)
				},
				inverterDirectives: toInverterDirectives(data.inverterDirectives),
				isModified: saveUnchangedData
			});
		}
	};

	const onSubmitGoBack = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		onSubmit(data);
		props.navigation.goBack();
	};

	useEffect(() => {
		if (embedded) return;
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					handleSubmit(onSubmitGoBack),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [saveUnchangedData]);

	useEffect(() => {
		if (embedded) return;
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				if (isSavingRef.current) return;
				e.preventDefault();
				isSavingRef.current = true;
				handleSubmit(data => {
					onSubmit(data);
					props.navigation.dispatch(e.data.action);
				})();
			}
		);
		return () => listenerUnsubscribe();
	}, [saveUnchangedData]);

	const inverterOf = (inverterId: any) =>
		(props.inverters ?? []).find((i: any) => `${i.id}` === `${inverterId}`);

	// Variateurs pas encore pilotés par la séquence (un seul ordre par variateur).
	const availableInverters = () => {
		const usedIds = directives.map((d: any) => `${d.inverterId}`);
		return (props.inverters ?? [])
			.filter((i: any) => !i.deletedAt && !usedIds.includes(`${i.id}`))
			.map((i: any) => ({ label: i.name ?? `${i.id}`, value: i.id }));
	};

	const addDirective = (inverterId: any) => {
		const inverter = inverterOf(inverterId);
		if (!inverter) return;
		appendDirective({
			inverterId: `${inverter.id}`,
			mode: isInverterMode(inverter.defaultMode)
				? inverter.defaultMode
				: InverterMode.RS485
		});
		setSaveUnchangedData(true);
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: { automaticallyAdjustKeyboardInsets: true };

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				<DateTimePickerForm
					mode={'time'}
					control={control}
					errors={errors}
					name="securityConfig.maxDuration"
					placeholder={i18n.t('cycle:sequence.security')}
					rules={{ required: i18n.t('cycle:sequence.securityRequired') }}
					onChangeText={() => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
			<View style={BoxFormStyle.boxForm}>
				<CollapsibleSection
					title={i18n.t('cycle:sequence.inverter.title')}
					icon={faBolt}
					badge={directiveFields.length}
					initiallyExpanded={directiveFields.length > 0}>
					{directiveFields.map((field: any, index: number) => {
						const directive = directives[index] ?? {};
						const name = `inverterDirectives.${index}`;
						return (
							<View key={field.id} style={styles.directive}>
								<View style={styles.directiveHeader}>
									<Text style={styles.directiveName} numberOfLines={1}>
										{inverterOf(directive.inverterId)?.name ??
											i18n.t('cycle:sequence.inverter.unknown')}
									</Text>
									<Pressable
										hitSlop={8}
										onPress={() => {
											removeDirective(index);
											setSaveUnchangedData(true);
										}}>
										<FontAwesomeIcon icon={faTrash} color="#E53E3E" />
									</Pressable>
								</View>
								<SelectForm
									lstData={INVERTER_MODES}
									control={control}
									errors={errors}
									name={`${name}.mode`}
									placeholder={i18n.t('cycle:sequence.inverter.mode')}
									rules={{
										required: i18n.t('cycle:sequence.inverter.modeRequired')
									}}
									onValueChange={() => setSaveUnchangedData(true)}
								/>
								{directive.mode === InverterMode.RS485 ? (
									<InputForm
										key={`${field.id}-frequency`}
										control={control}
										errors={errors}
										name={`${name}.frequency`}
										placeholder={i18n.t('cycle:sequence.inverter.frequency')}
										keyboardType="decimal-pad"
										rules={{
											required: i18n.t(
												'cycle:sequence.inverter.frequencyRequired'
											),
											validate: numberRule
										}}
										onChangeText={() => setSaveUnchangedData(true)}
									/>
								) : null}
								{directive.mode === InverterMode.PID ? (
									<InputForm
										key={`${field.id}-pidSetpoint`}
										control={control}
										errors={errors}
										name={`${name}.pidSetpoint`}
										placeholder={i18n.t('cycle:sequence.inverter.pidSetpoint')}
										keyboardType="decimal-pad"
										rules={{ validate: numberRule }}
										onChangeText={() => setSaveUnchangedData(true)}
									/>
								) : null}
							</View>
						);
					})}
					{availableInverters().length > 0 ? (
						<SelectForm
							lstData={availableInverters()}
							control={control}
							errors={errors}
							name="inverterToAdd"
							placeholder={i18n.t('cycle:sequence.inverter.select')}
							rules={{ required: false }}
							onValueChange={value => {
								addDirective(value);
								// Vide le sélecteur : le variateur ajouté n'y reste pas affiché.
								setValue('inverterToAdd', null);
							}}
						/>
					) : directiveFields.length === 0 ? (
						<Text style={styles.empty}>
							{i18n.t('cycle:sequence.inverter.none')}
						</Text>
					) : null}
				</CollapsibleSection>
			</View>
		</Body>
	);
}

const COLORS = {
	text: '#32404e',
	border: '#e5e7eb'
};

const styles = StyleSheet.create({
	directive: {
		marginVertical: 6,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: COLORS.border
	},
	directiveHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10
	},
	directiveName: {
		flexShrink: 1,
		color: COLORS.text,
		fontWeight: 'bold'
	},
	empty: { color: fieldLabelColor, paddingVertical: 8 }
});

const mapStateToProps = (state: any) => ({
	inverters: state.root_inverter.inverters
});

export default connect(mapStateToProps, {
	updateSequence
})(SequenceSecuritySettingsSection);
