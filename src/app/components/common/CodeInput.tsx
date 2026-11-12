import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React from 'react';
import {Platform, StyleSheet, Text, TextInput, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {placeholderColor} from '../../styles/components/common/Input';
import {BoxLoginResult} from '../../../module/authentication/domain/services/auth.service';
import {COLORS} from '../../screens/access/accessUi';

// Saisie du code de récupération envoyé par la box à l'email de récupération,
// partagée par « mot de passe oublié » et le changement de mot de passe des
// réglages utilisateur.

/** Durée de validité du code de récupération. */
export const CODE_TTL_SECONDS = 1 * 60;

/** Compte à rebours circulaire, le temps restant affiché au centre. */
export const CountdownCircle = ({
	remaining,
	total,
	size = 52,
	strokeWidth = 4
}: {
	remaining: number;
	total: number;
	size?: number;
	strokeWidth?: number;
}) => {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const progress = total > 0 ? remaining / total : 0;
	const minutes = Math.floor(remaining / 60);
	const seconds = String(remaining % 60).padStart(2, '0');
	return (
		<View style={[styles.countdown, { width: size, height: size }]}>
			<Svg
				width={size}
				height={size}
				// Le cercle part du haut et se vide dans le sens horaire.
				style={{ transform: [{ rotate: '-90deg' }] }}
			>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={COLORS_TRACK}
					strokeWidth={strokeWidth}
					fill="none"
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					stroke={COLORS.primary}
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={circumference * (1 - progress)}
					fill="none"
				/>
			</Svg>
			<Text style={styles.countdownText}>
				{minutes}:{seconds}
			</Text>
		</View>
	);
};

const COLORS_TRACK = '#CBD5E0';
const TRANSPARENT = 'transparent';

/** Nombre de caractères du code de récupération. */
export const CODE_LENGTH = 6;

/**
 * Saisie du code en cases : un tiret par caractère attendu, remplacé au fil
 * de la frappe. Un vrai `TextInput` couvre les cases et reçoit la saisie,
 * ce qui garde le collage (appui long) et le remplissage automatique du code
 * reçu par email (`oneTimeCode`). Il est rendu transparent (texte, curseur,
 * sélection) et non d'opacité nulle : iOS ne transmet aucun toucher à une vue
 * d'opacité nulle, l'appui long « Coller » n'arriverait jamais au champ.
 */
export const CodeInput = ({
	value,
	onChangeText,
	onSubmit
}: {
	value: string;
	onChangeText: (value: string) => void;
	onSubmit: () => void;
}) => {
	const [focused, setFocused] = React.useState(false);
	const activeIndex = Math.min(value.length, CODE_LENGTH - 1);
	return (
		<View style={styles.codeRow}>
			{Array.from({ length: CODE_LENGTH }, (_, i) => {
				const char = value[i];
				return (
					<View
						key={i}
						style={[
							styles.codeCell,
							char ? styles.codeCellFilled : null,
							focused && i === activeIndex
								? styles.codeCellActive
								: null
						]}
					>
						<Text style={char ? styles.codeChar : styles.codeDash}>
							{char ?? '–'}
						</Text>
					</View>
				);
			})}
			<TextInput
				style={styles.codeHiddenInput}
				value={value}
				// Pas de `maxLength` : il tronquerait un collage (« 123456 »,
				// espaces compris) avant le nettoyage de `onChangeText`.
				textContentType={'oneTimeCode'}
				// Android ne connaît pas `one-time-code` : seul `sms-otp` y
				// signale un champ de code (remplissage auto, suggestion du
				// clavier).
				autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
				importantForAutofill={'yes'}
				autoCapitalize={'none'}
				autoCorrect={false}
				// `caretHidden` bloque l'appui long (menu Coller) sur Android :
				// le curseur y est seulement rendu transparent.
				caretHidden={Platform.OS === 'ios'}
				cursorColor={TRANSPARENT}
				selectionColor={TRANSPARENT}
				// Android dessine encore, malgré le texte transparent, ce qu'iOS
				// n'affiche pas : poignées de sélection, soulignement du mot en
				// cours de frappe par le clavier, trait de l'EditText. Rien de
				// tout cela ne doit transparaître sur les cases.
				selectionHandleColor={TRANSPARENT}
				underlineColorAndroid={TRANSPARENT}
				spellCheck={false}
				contextMenuHidden={false}
				returnKeyType={'done'}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onChangeText={text =>
					onChangeText(text.replace(/\s/g, '').slice(0, CODE_LENGTH))
				}
				onSubmitEditing={onSubmit}
			/>
		</View>
	);
};

/** Échec lié au code (et non au mot de passe) : il faut en saisir un autre. */
export const isCodeFailure = (res: BoxLoginResult) =>
	!!res.status && /RECOVERY_CODE/i.test(res.status);
export const isCodeExpired = (res: BoxLoginResult) =>
	!!res.status && /EXPIRED/i.test(res.status);
/** Plus aucune tentative : le code est grillé, seul un renvoi débloque. */
export const isCodeLocked = (res: BoxLoginResult) =>
	res.attemptsRemaining === 0 ||
	(!!res.status && /LOCKED|BLOCKED|TOO_MANY/i.test(res.status));

const styles = StyleSheet.create({
	codeRow: {
		flex: 1,
		flexDirection: 'row',
		gap: 6
	},
	codeCell: {
		flex: 1,
		height: ELEMENT_HEIGHT,
		borderWidth: 1,
		borderColor: COLORS_TRACK,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center'
	},
	codeCellFilled: {
		borderColor: COLORS.primary
	},
	codeCellActive: {
		borderColor: COLORS.primary,
		borderWidth: 2
	},
	codeChar: {
		color: COLORS.primary,
		fontSize: 20,
		fontWeight: 'bold'
	},
	codeDash: {
		color: placeholderColor,
		fontSize: 20
	},
	codeHiddenInput: {
		...StyleSheet.absoluteFillObject,
		color: TRANSPARENT,
		backgroundColor: TRANSPARENT,
		// Texte minuscule : ce qu'Android y superpose encore (surlignage du
		// remplissage automatique, soulignement de composition) reste
		// invisible, sans réduire la zone qui reçoit l'appui long « Coller ».
		fontSize: 1,
		padding: 0
	},
	countdown: {
		alignItems: 'center',
		justifyContent: 'center'
	},
	countdownText: {
		position: 'absolute',
		color: COLORS.primary,
		fontSize: 12,
		fontWeight: 'bold'
	}
});
