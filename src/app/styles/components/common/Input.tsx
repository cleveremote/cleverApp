import {ELEMENT_FONT_SIZE, ELEMENT_HEIGHT} from '../../metrics';
import {StyleSheet} from 'react-native';

export const placeholderColor = 'grey';

// --- Libellés : source unique pour toute l'application ----------------------
// Format « Décalage » du déclencheur solaire : gris, 13, semi-gras. À spreader
// dans une feuille de style locale (`...fieldLabelText`) ou à utiliser via
// InputStyle.fieldLabel / textInput (au-dessus d'un champ) / switchLabel (à
// côté d'un interrupteur).
export const fieldLabelColor = '#718096';
export const fieldLabelText = {
	color: fieldLabelColor,
	fontSize: 13,
	fontWeight: '600' as const
};

// --- Texte des lignes elementStack (listes hors cycles et sensors) ----------
// Pas de gras, gris des libellés un peu plus foncé pour rester lisible.
export const stackLabelColor = '#4A5568';
export const stackLabelText = {
	color: stackLabelColor,
	fontSize: ELEMENT_FONT_SIZE,
	fontWeight: 'normal' as const
};

// Style du texte saisi, commun à tous les champs de l'application.
export const inputText = {
	color: '#32404e',
	fontSize: ELEMENT_FONT_SIZE,
	fontWeight: 'bold' as const
};

export const InputStyle = StyleSheet.create({
	// Libellé au-dessus d'un champ (InputForm, TextAreaForm, DateTimePickerForm…).
	textInput: {
		...fieldLabelText,
		marginBottom: 5,
		marginTop: 5
	},
	// Libellé seul, sans marge.
	fieldLabel: fieldLabelText,
	// Libellé à côté d'un interrupteur (SwitchForm, lignes AppSwitch).
	switchLabel: {
		...fieldLabelText,
		flexShrink: 1,
		marginRight: 8
	},
	input: {...inputText, height: ELEMENT_HEIGHT},
	// Champ en lecture seule : fond et texte grisés.
	inputDisabled: {
		backgroundColor: '#EDF2F7',
		color: '#A0AEC0',
		borderColor: '#E2E8F0'
	}
});
