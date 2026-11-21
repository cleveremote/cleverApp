import React from 'react';
import {
	Pressable,
	StyleSheet,
	TextInput,
	TextInputProps,
	View
} from 'react-native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons';

const ICON_COLOR = '#32404e';
const ICON_SIZE = 18;
/** Zone de l'icône : réservée à droite pour que le texte ne passe pas dessous. */
const TOGGLE_WIDTH = 44;

/**
 * Champ mot de passe masqué, avec un œil à droite pour l'afficher en clair.
 * Accepte les props d'un `TextInput` ; `style` s'applique au champ.
 */
export function PasswordInput({style, ...props}: Readonly<TextInputProps>) {
	const [visible, setVisible] = React.useState(false);
	return (
		<View style={styles.wrap}>
			<TextInput
				{...props}
				style={[style, styles.input]}
				secureTextEntry={!visible}
				autoCapitalize={'none'}
				autoCorrect={false}
			/>
			<Pressable
				style={styles.toggle}
				hitSlop={8}
				accessibilityRole={'button'}
				onPress={() => setVisible(v => !v)}>
				<FontAwesomeIcon
					icon={visible ? faEyeSlash : faEye}
					size={ICON_SIZE}
					color={ICON_COLOR}
				/>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: {justifyContent: 'center'},
	input: {paddingRight: TOGGLE_WIDTH},
	toggle: {
		position: 'absolute',
		right: 0,
		top: 0,
		bottom: 0,
		width: TOGGLE_WIDTH,
		alignItems: 'center',
		justifyContent: 'center'
	}
});
