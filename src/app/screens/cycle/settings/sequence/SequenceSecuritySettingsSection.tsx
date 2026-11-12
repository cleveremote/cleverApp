import React, { useEffect } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';
import {
	InputStyle,
	inputText,
	placeholderColor
} from '../../../../styles/components/common/Input';
import { ELEMENT_FONT_SIZE, ELEMENT_HEIGHT } from '../../../../styles/metrics';
import { navigationHeader } from '../../../../components/common/navigationHeaders';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import {
	DateTimePickerForm,
	DropdownSelect,
	FieldError
} from '../../../../components/common/FormComponents';
import { AppSwitch } from '../../../../components/common/AppSwitch';
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
//            (`pidSetpoint`, obligatoire) ;
//  - RS485 : consigne de fréquence écrite par la box (0x2000), `frequency`
//            obligatoire.
export enum InverterMode {
	PID = 'PID',
	RS485 = 'RS485'
}

// Élément de la liste des variateurs. `iconColor` satisfait la contrainte
// générique de DropdownSelect (cf. ConditionBuilderSection).
interface InverterItem {
	label: string;
	value: string;
	iconColor?: { base: string };
}

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
	(directives ?? []).map((d: any) => ({
		inverterId: `${d.inverterId}`,
		mode: d.mode,
		...(d.mode === InverterMode.RS485
			? { frequency: toNumber(d.frequency) }
			: {}),
		...(d.mode === InverterMode.PID
			? { pidSetpoint: toNumber(d.pidSetpoint) }
			: {})
	}));

// Directive non conforme au DTO (section Security en rouge au save).
export const isInverterDirectiveInvalid = (d: any) =>
	isEmpty(d?.inverterId) ||
	!isInverterMode(d?.mode) ||
	(d.mode === InverterMode.RS485 && typeof d.frequency !== 'number') ||
	(d.mode === InverterMode.PID && typeof d.pidSetpoint !== 'number');

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

	// Un seul variateur piloté. L'interrupteur « Paramètres de régulation »
	// crée ou retire la directive ; changer de variateur repart de son mode par
	// défaut.
	const directive = directives[0];
	const directiveErrors: any = (errors as any).inverterDirectives?.[0];
	const isRs485 = directive?.mode === InverterMode.RS485;
	const inverterItems: InverterItem[] = (props.inverters ?? [])
		.filter((i: any) => !i.deletedAt)
		.map((i: any) => ({ label: i.name ?? `${i.id}`, value: `${i.id}` }));

	// La section est déjà validée (showErrors) quand le champ de valeur change
	// (bascule PID / RS485, autre variateur, régulation activée) : le nouveau
	// champ monte après cette validation, sa règle « obligatoire » ne serait
	// vérifiée qu'à la première saisie. On revalide une fois qu'il est monté.
	useEffect(() => {
		if (props.showErrors && directive) trigger('inverterDirectives');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.showErrors, directive?.mode, directive?.inverterId, directiveFields.length]);

	const toggleRegulation = (on: boolean) => {
		if (on) appendDirective({ inverterId: '', mode: InverterMode.RS485 });
		else removeDirective(0);
		setSaveUnchangedData(true);
	};

	// Le Controller pose l'id ; le mode repart de celui du variateur et la
	// valeur saisie est vidée. (Pas de `update()` du field array : il remonte
	// les champs et le Controller garderait l'ancienne valeur.)
	const selectInverter = (
		inverterId: string,
		onChange: (value: string) => void
	) => {
		const inverter = (props.inverters ?? []).find(
			(i: any) => `${i.id}` === inverterId
		);
		onChange(inverterId);
		setValue(
			'inverterDirectives.0.mode',
			isInverterMode(inverter?.defaultMode)
				? inverter.defaultMode
				: InverterMode.RS485
		);
		setValue('inverterDirectives.0.frequency', undefined);
		setValue('inverterDirectives.0.pidSetpoint', undefined);
		setSaveUnchangedData(true);
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: { automaticallyAdjustKeyboardInsets: true };

	return (
		<Body {...bodyProps}>
			<View style={[BoxFormStyle.boxForm, styles.card]}>
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
				{/* Régulation dans la même carte, juste sous la durée maximale. */}
				<View style={[styles.switchRow, !directive && styles.switchRowLast]}>
					<Text style={InputStyle.switchLabel}>
						{i18n.t('cycle:sequence.inverter.title')}
					</Text>
					<AppSwitch value={!!directive} onValueChange={toggleRegulation} />
				</View>
				{directive ? (
					// Variateur, mode et consigne regroupés dans un cadre arrondi,
					// au même trait qu'un input.
					<View style={styles.frame}>
						<Text style={InputStyle.textInput}>
							{i18n.t('cycle:sequence.inverter.select')}
						</Text>
						<Controller
							control={control}
							name="inverterDirectives.0.inverterId"
							rules={{
								required: i18n.t('cycle:sequence.inverter.inverterRequired')
							}}
							render={({ field: { value, onChange } }) => (
								<DropdownSelect<InverterItem>
									items={inverterItems}
									value={value ? `${value}` : ''}
									getLabel={item => item.label}
									getValue={item => item.value}
									onChange={id => selectInverter(`${id}`, onChange)}
									hasError={!!directiveErrors?.inverterId}
								/>
							)}
						/>
						<FieldError error={directiveErrors?.inverterId} />

						{/* Mode (bouton à bascule, comme Cycle / Sensor des
						    conditions) et sa valeur sur la même ligne. */}
						<View style={styles.modeRow}>
							<Controller
								control={control}
								name="inverterDirectives.0.mode"
								rules={{
									required: i18n.t('cycle:sequence.inverter.modeRequired')
								}}
								render={({ field: { value, onChange } }) => (
									<TouchableOpacity
										accessibilityRole="button"
										accessibilityLabel={i18n.t('cycle:sequence.inverter.mode')}
										onPress={() => {
											ReactNativeHapticFeedback.trigger(
												'impactMedium',
												hapticOptions
											);
											onChange(
												value === InverterMode.RS485
													? InverterMode.PID
													: InverterMode.RS485
											);
											setSaveUnchangedData(true);
										}}
										style={styles.modeBtn}>
										<Text style={styles.modeBtnTxt}>{value}</Text>
									</TouchableOpacity>
								)}
							/>
							<Controller
								key={`${directiveFields[0]?.id}-${directive.mode}`}
								control={control}
								name={
									isRs485
										? 'inverterDirectives.0.frequency'
										: 'inverterDirectives.0.pidSetpoint'
								}
								rules={
									isRs485
										? {
												required: i18n.t(
													'cycle:sequence.inverter.frequencyRequired'
												),
												validate: numberRule
										  }
										: {
												required: i18n.t(
													'cycle:sequence.inverter.pidSetpointRequired'
												),
												validate: numberRule
										  }
								}
								render={({ field: { value, onChange, onBlur } }) => (
									<TextInput
										style={[
											styles.valueInput,
											(isRs485
												? directiveErrors?.frequency
												: directiveErrors?.pidSetpoint) &&
												styles.valueInputError
										]}
										placeholder={i18n.t(
											isRs485
												? 'cycle:sequence.inverter.frequency'
												: 'cycle:sequence.inverter.pidSetpoint'
										)}
										placeholderTextColor={placeholderColor}
										keyboardType="decimal-pad"
										value={value === undefined || value === null ? '' : `${value}`}
										onBlur={onBlur}
										onChangeText={text => {
											onChange(text);
											setSaveUnchangedData(true);
										}}
									/>
								)}
							/>
						</View>
						<FieldError
							error={
								isRs485 ? directiveErrors?.frequency : directiveErrors?.pidSetpoint
							}
						/>
					</View>
				) : null}
			</View>
		</Body>
	);
}

const COLORS = {
	text: '#32404e',
	// Bordure des inputs (cf. DropdownSelect).
	border: '#CBD5E0',
	errorBorder: '#FC8181',
	shadow: '#000000',
	white: '#ffffff'
};

const styles = StyleSheet.create({
	frame: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingBottom: 10
	},
	// Carte collée à la section suivante (Préconditions).
	card: { marginBottom: 0, paddingBottom: 0 },
	// Dernière ligne de la carte (régulation désactivée) : pas d'espace dessous.
	switchRowLast: { marginBottom: 0 },
	// Sous l'input de durée : petit écart haut, comme entre deux champs.
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8,
		marginBottom: 8
	},
	modeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
	// Bouton à bascule PID / RS485 : même rendu que le bouton Cycle / Sensor
	// des conditions (fond slate, texte blanc, hauteur d'un input).
	modeBtn: {
		height: ELEMENT_HEIGHT,
		minWidth: 80,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.text,
		backgroundColor: COLORS.text,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 2,
		shadowColor: COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.18,
		shadowRadius: 2
	},
	modeBtnTxt: { fontSize: ELEMENT_FONT_SIZE, color: COLORS.white, fontWeight: 'bold' },
	valueInput: {
		flex: 1,
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		...inputText
	},
	valueInputError: { borderWidth: 2, borderColor: COLORS.errorBorder }
});

const mapStateToProps = (state: any) => ({
	inverters: state.root_inverter.inverters
});

export default connect(mapStateToProps, {
	updateSequence
})(SequenceSecuritySettingsSection);
