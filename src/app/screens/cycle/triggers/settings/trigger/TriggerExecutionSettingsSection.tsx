import React, {useEffect, useRef, useState} from 'react';
import {
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import {SolarTriggerFields} from '../../../../../components/common/SolarTriggerFields';
import {WarningBox} from '../../../../../components/common/WarningBox';
import type {EventArg, NavigationAction} from '@react-navigation/core';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {BoxFormStyle} from '../../../../../styles/components/common/boxForm';
import {
	DateTimePickerForm,
	SwitchForm
} from '../../../../../components/common/FormComponents';
import {InputStyle} from '../../../../../styles/components/common/Input';
import {ELEMENT_HEIGHT} from '../../../../../styles/metrics';
import {OutlineButton} from '../../../../access/accessUi';
import {faPowerOff} from '@fortawesome/free-solid-svg-icons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {Controller, useForm} from 'react-hook-form';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../../../components/common/useSectionSettingsHeader';
import {updateTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';
import {connect} from 'react-redux';
import i18n from 'i18next';
import {
	durationToPickerDate,
	pickerDateToDuration
} from '../../../../../../services/time';


// Les anciens triggers n'ont pas de timeDirection : « après le coucher » et
// « avant le lever » étaient implicites.
const defaultTimeDirection = (sunBehavior: any) =>
	sunBehavior?.timeDirection ??
	(sunBehavior?.sunState === 'SUNSET' ? 'AFTER' : 'BEFORE');

export function TriggerExecutionSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const parentRef = useRef(props.triggerData);
	parentRef.current = props.triggerData;
	const defValues = {
		...(embedded ? props.triggerData : props.route.params?.triggerData)
	};
	const defaultValues = {
		// ON par défaut (anciens triggers sans action).
		action: defValues.action ?? 'ON',
		delay: durationToPickerDate(defValues.delay),
		timeAfter: durationToPickerDate(defValues.trigger?.timeAfter),
		sunState: defValues.trigger?.sunBehavior?.sunState,
		timeDirection: defaultTimeDirection(defValues.trigger?.sunBehavior),
		time: durationToPickerDate(defValues.trigger?.sunBehavior?.time),
		isPaused: defValues.isPaused,
		shouldConfirmation: defValues.shouldConfirmation
	};

	const [sunState, setSunState] = useState(
		!!defValues.trigger?.sunBehavior?.sunState
	);
	const sunStateRef = useRef(!!defValues.trigger?.sunBehavior?.sunState);
	const saveUnchangedData = useRef(false);

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue,
		watch,
		getValues,
		trigger
	} = useForm<any>({defaultValues, mode: 'onChange'});

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data => {
			const dto = mappingtoDto(data);
			props.updateTrigger({
				...parentRef.current,
				action: dto.action,
				delay: dto.delay,
				trigger: dto.trigger,
				isPaused: dto.isPaused,
				shouldConfirmation: dto.shouldConfirmation,
				isModified: true
			});
		}
	});

	const onSubmit = (data: any) => {
		if (saveUnchangedData.current) {
			props.updateTrigger({
				...mappingtoDto(data),
				isModified: saveUnchangedData.current
			});
		}
	};

	const mappingtoDto = (data: any) => {
		const result = {...defValues};
		result.delay = pickerDateToDuration(data.delay);
		result.action = data.action;
		result.isPaused = data.isPaused;
		result.shouldConfirmation = data.shouldConfirmation;
		if (sunStateRef.current) {
			result.trigger = {
				...result.trigger,
				sunBehavior: {
					sunState: data.sunState,
					timeDirection: data.timeDirection,
					time: pickerDateToDuration(data.time)
				},
				timeAfter: undefined
			};
		} else {
			result.trigger = {
				...result.trigger,
				timeAfter: pickerDateToDuration(data.timeAfter),
				sunBehavior: undefined
			};
		}
		return result;
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
					i18n.t('common:discard.title'),
					i18n.t('common:discard.invalidMessage'),
					[
						{
							text: i18n.t('common:discard.continue'),
							style: 'cancel',
							onPress: onContinue
						},
						{
							text: i18n.t('common:discard.confirm'),
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Mode du déclencheur : après un délai (false) ou phase solaire (true).
	const setSolarMode = (checked: boolean) => {
		sunStateRef.current = checked;
		setSunState(checked);
		if (checked) {
			setValue(
				'timeAfter',
				new Date(new Date().setHours(0, 0, 0, 0)),
				{shouldValidate: true}
			);
			setValue('sunState', 'SUNRISE', {
				shouldValidate: true
			});
			setValue('timeDirection', 'BEFORE', {
				shouldValidate: true
			});
		} else {
			setValue('sunState', null, {
				shouldValidate: true
			});
			setValue(
				'time',
				new Date(new Date().setHours(0, 0, 0, 0)),
				{shouldValidate: true}
			);
		}
		saveUnchangedData.current = true;
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				{/* Action : bouton outline qui bascule ON / OFF à chaque toucher. */}
				<Controller
					control={control}
					name="action"
					rules={{required: i18n.t('cycle:triggers.actionRequired')}}
					render={({field: {value, onChange}}) => (
						<View style={styles.actionRow}>
							<OutlineButton
								label={value ?? '—'}
								icon={faPowerOff}
								color={value === 'ON' ? COLORS.on : COLORS.off}
								accessibilityLabel={`${i18n.t('cycle:triggers.action')} ${
									value ?? ''
								}`}
								onPress={() => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									onChange(value === 'ON' ? 'OFF' : 'ON');
									saveUnchangedData.current = true;
								}}
								style={styles.actionButton}
							/>
							{/* Mode : bouton outline à double choix. */}
							<View style={styles.modeToggle}>
								{[false, true].map(solar => {
									const active = sunState === solar;
									return (
										<TouchableOpacity
											key={solar ? 'solar' : 'delay'}
											accessibilityRole="button"
											accessibilityState={{selected: active}}
											onPress={() => {
												if (active) return;
												ReactNativeHapticFeedback.trigger(
													'impactMedium',
													hapticOptions
												);
												setSolarMode(solar);
											}}
											style={[
												styles.modeOption,
												active && styles.modeOptionActive
											]}>
											<Text
												numberOfLines={1}
												adjustsFontSizeToFit
												minimumFontScale={0.8}
												style={[
													styles.modeLabel,
													active && styles.modeLabelActive
												]}>
												{i18n.t(
													solar
														? 'cycle:triggers.modeSolar'
														: 'cycle:triggers.modeDelay'
												)}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					)}
				/>
				{errors.action ? (
					<Text style={InputStyle.textInputError}>
						{errors.action.message as string}
					</Text>
				) : null}
				{sunState ? (
					<View style={styles.solarBox}>
						{/* Critères solaires dans une box, comme dans la planification. */}
						<SolarTriggerFields
							value={{
								sunState: watch('sunState') ?? 'SUNRISE',
								timeDirection: watch('timeDirection') ?? 'BEFORE',
								time: watch('time') ? pickerDateToDuration(watch('time')) : 0
							}}
							onChange={patch => {
								if (patch.sunState)
									setValue('sunState', patch.sunState, {shouldValidate: true});
								if (patch.timeDirection)
									setValue('timeDirection', patch.timeDirection, {
										shouldValidate: true
									});
								if (patch.time !== undefined)
									setValue('time', durationToPickerDate(patch.time), {
										shouldValidate: true
									});
								saveUnchangedData.current = true;
							}}
						/>
					</View>
				) : (
					<DateTimePickerForm
						mode={'time'}
						control={control}
						errors={errors}
						name="timeAfter"
						placeholder={i18n.t('cycle:triggers.after')}
						rules={{required: i18n.t('cycle:triggers.afterRequired')}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
				)}
				<DateTimePickerForm
					mode={'time'}
					control={control}
					errors={errors}
					name="delay"
					placeholder={i18n.t('cycle:triggers.disableFor')}
					rules={{required: i18n.t('cycle:triggers.delayRequired')}}
					onChangeText={() => {
						saveUnchangedData.current = true;
					}}
				/>
				<WarningBox hideIcon style={styles.warning}>
					<SwitchForm
						control={control}
						errors={errors}
						name="isPaused"
						placeholder={i18n.t('cycle:schedules.setPaused')}
						rules={{required: false}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
					<SwitchForm
						control={control}
						errors={errors}
						name="shouldConfirmation"
						placeholder={i18n.t('cycle:schedules.needConfirmation')}
						rules={{required: false}}
						onChangeText={() => {
							saveUnchangedData.current = true;
						}}
					/>
				</WarningBox>
			</View>
		</Body>
	);
}

// Action ON (vert, comme l'état « connecté ») / OFF (slate).
const COLORS = {
	on: '#16a34a',
	off: '#32404e',
	onText: '#ffffff',
	shadow: '#000'
};

const styles = StyleSheet.create({
	// Bouton seul (sans libellé), en début de ligne.
	// Même box que l'éditeur solaire de la planification (editorCard).
	solarBox: {
		backgroundColor: COLORS.onText,
		borderRadius: 12,
		padding: 14,
		marginVertical: 8,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	actionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: 8,
		marginBottom: 8
	},
	// Double choix Après délai / Phase solaire : même contour que l'OutlineButton.
	modeToggle: {
		flex: 1,
		flexDirection: 'row',
		height: ELEMENT_HEIGHT,
		borderWidth: 2,
		borderColor: COLORS.off,
		borderRadius: 12,
		overflow: 'hidden'
	},
	modeOption: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6
	},
	modeOptionActive: {backgroundColor: COLORS.off},
	modeLabel: {color: COLORS.off, fontSize: 14, fontWeight: 'bold'},
	modeLabelActive: {color: COLORS.onText},
	// OutlineButton à droite de la ligne : sans sa marge / son centrage par
	// défaut, largeur fixe pour que ON et OFF aient la même taille.
	actionButton: {
		marginTop: 0,
		alignSelf: 'auto',
		minWidth: 96,
		justifyContent: 'center'
	},
	warning: {
		marginTop: 8
	}
});

export default connect(null, {
	updateTrigger
})(TriggerExecutionSettingsSection);
