import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCheck, faInfo} from '@fortawesome/free-solid-svg-icons';
import {Control, FieldErrors, useWatch} from 'react-hook-form';
import i18n from 'i18next';
import {InfoBox, INFO_COLORS} from './InfoBox';
import {InputForm, SelectColor, TextAreaForm} from './FormComponents';
import {ELEMENT_HEIGHT} from '../../styles/metrics';

/**
 * Champs communs des sections « General » embarquées (cycle, sensor) :
 *  - une ligne icône de section (cercle « i », comme les en-têtes
 *    MenuAccordion, rouge si la section est « not valid ») + thème (pastille
 *    seule, seulement si `onThemeChange` est fourni) + nom (sans libellé) ;
 *  - la description, masquée par défaut : l'icône l'affiche dans une InfoBox,
 *    un toucher sur l'InfoBox passe en édition, la coche revient à l'affichage.
 * Les champs `style`, `name` et `description` sont ceux du formulaire parent.
 */
export function GeneralSettingsFields({
	control,
	errors,
	showErrors,
	themeStyle,
	themePlaceholder,
	colorProportion,
	nameMaxLength,
	onThemeChange,
	onEdit
}: Readonly<{
	control: Control<any, any>;
	errors: FieldErrors<any>;
	showErrors?: boolean;
	// Style actuel, pour présélectionner la couleur.
	themeStyle?: any;
	themePlaceholder?: string;
	colorProportion?: number;
	nameMaxLength?: number;
	// Absent : pas de champ thème (sections avec seulement nom + description).
	onThemeChange?: (value: string) => void;
	// Appelé à chaque saisie du nom ou de la description.
	onEdit: () => void;
}>) {
	const [showDescription, setShowDescription] = React.useState(false);
	const [editingDescription, setEditingDescription] = React.useState(false);
	const description: string | undefined = useWatch({control, name: 'description'});

	return (
		<>
			<View style={styles.themeNameRow}>
				<TouchableOpacity
					onPress={() => {
						setShowDescription(v => !v);
						setEditingDescription(false);
					}}
					accessibilityRole="button"
					accessibilityLabel={i18n.t('common:form.description')}
					accessibilityState={{expanded: showDescription}}
					hitSlop={8}
					style={[styles.sectionIcon, showErrors && styles.sectionIconInvalid]}>
					<FontAwesomeIcon
						icon={faInfo}
						size={20}
						color={showErrors ? COLORS.error : COLORS.text}
					/>
				</TouchableOpacity>
				{onThemeChange ? (
					<View style={styles.themeField}>
						<SelectColor
							control={control}
							errors={errors}
							name="style"
							placeholder={themePlaceholder ?? ''}
							rules={{required: i18n.t('cycle:settings.themeRequired')}}
							colorProportion={colorProportion}
							hideLabel
							style={themeStyle}
							onChangeText={onThemeChange}
						/>
					</View>
				) : null}
				<View style={styles.nameField}>
					<InputForm
						control={control}
						errors={errors}
						name="name"
						maxLength={nameMaxLength}
						hideLabel
						inputStyle={styles.input}
						placeholder={i18n.t('common:form.name')}
						rules={{required: i18n.t('common:form.nameRequired')}}
						onChangeText={onEdit}
					/>
				</View>
			</View>
			{!showDescription ? null : editingDescription ? (
				<View style={styles.descriptionEditRow}>
					<View style={styles.descriptionField}>
						<TextAreaForm
							control={control}
							errors={errors}
							name="description"
							hideLabel
							inputStyle={styles.input}
							placeholder={i18n.t('common:form.description')}
							onChangeText={onEdit}
						/>
					</View>
					<TouchableOpacity
						onPress={() => setEditingDescription(false)}
						accessibilityRole="button"
						accessibilityLabel={i18n.t('common:form.done')}
						hitSlop={8}
						style={styles.descriptionDone}>
						<FontAwesomeIcon icon={faCheck} size={16} color={COLORS.text} />
					</TouchableOpacity>
				</View>
			) : (
				<TouchableOpacity
					onPress={() => setEditingDescription(true)}
					accessibilityRole="button"
					accessibilityLabel={i18n.t('common:form.editDescription')}
					style={styles.descriptionTouch}>
					<InfoBox>
						<Text
							style={[
								styles.descriptionText,
								!description && styles.descriptionEmpty
							]}>
							{description || i18n.t('common:form.noDescription')}
						</Text>
					</InfoBox>
				</TouchableOpacity>
			)}
		</>
	);
}

const COLORS = {
	inputBackground: 'white',
	transparent: 'transparent',
	text: '#32404e',
	error: '#E53E3E'
};

const styles = StyleSheet.create({
	// boxForm d'une section embarquée : marges resserrées (le padding de 10
	// place l'icône à 10 du bord, comme celles des en-têtes de section) et pas
	// de fond, la section étant posée directement sur le fond de l'écran.
	embeddedBox: {
		marginVertical: 0,
		marginHorizontal: 0,
		paddingVertical: 6,
		paddingHorizontal: 10,
		backgroundColor: COLORS.transparent
	},
	// Conteneur de la section dans l'écran : même emprise que les cartes
	// (marges), sans fond ni ombre.
	bareContainer: {
		alignSelf: 'stretch',
		marginTop: 8,
		marginHorizontal: 20
	},
	// Champs toujours sur fond blanc, même posés hors carte (cycle `bare`).
	input: {backgroundColor: COLORS.inputBackground},
	themeNameRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
	// Même cercle que l'icône des en-têtes MenuAccordion ; marginTop centre le
	// cercle (35) sur les champs (marginTop 4 + ELEMENT_HEIGHT).
	sectionIcon: {
		width: 35,
		height: 35,
		marginTop: 4 + (ELEMENT_HEIGHT - 35) / 2,
		borderRadius: 17.5,
		borderWidth: 2.5,
		borderColor: COLORS.text,
		justifyContent: 'center',
		alignItems: 'center'
	},
	sectionIconInvalid: {borderColor: COLORS.error},
	themeField: {width: 60},
	// Décalage égal au marginVertical du DropdownSelect pour aligner les champs.
	nameField: {flex: 1, marginTop: 4},
	descriptionTouch: {marginTop: 8},
	descriptionText: {color: INFO_COLORS.text, fontSize: 14},
	descriptionEmpty: {fontStyle: 'italic', opacity: 0.7},
	descriptionEditRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
	descriptionField: {flex: 1, marginTop: 4},
	// Centrée sur la première ligne du champ (hauteur ELEMENT_HEIGHT).
	descriptionDone: {height: ELEMENT_HEIGHT, marginTop: 4, justifyContent: 'center'}
});

/** Style de boxForm à appliquer quand la section est embarquée. */
export const generalEmbeddedBoxStyle = styles.embeddedBox;
/** Conteneur de la section General dans son écran (sans carte blanche). */
export const generalContainerStyle = styles.bareContainer;
