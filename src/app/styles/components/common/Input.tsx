import {StyleSheet} from 'react-native';

export const placeholderColor = 'grey';

export const InputStyle = StyleSheet.create({
	textInput: {
		color: '#32404e',
		fontSize: 15,
		fontWeight: 'bold',
		marginBottom: 5,
		marginTop: 5
	},
	input: {color: '#32404e', fontSize: 15, fontWeight: 'bold', height: 50},
	// Champ en lecture seule : fond et texte grisés.
	inputDisabled: {
		backgroundColor: '#EDF2F7',
		color: '#A0AEC0',
		borderColor: '#E2E8F0'
	},
	textInputError: {
		color: 'red',
		fontSize: 15,
		fontWeight: 'bold',
		marginBottom: 5,
		marginTop: 5,
		marginRight: 5
	},
	iconInputError: {
		color: 'red',
		fontSize: 15,
		fontWeight: 'bold',
		marginBottom: 5,
		marginTop: 7,
		marginRight: 5
	}
});
