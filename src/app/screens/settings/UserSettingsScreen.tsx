import {
	Button,
	Keyboard,
	Pressable,
	StyleSheet,
	Text,
	View
} from 'react-native';
import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faPowerOff,
	faRotateLeft,
	faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import {pick, types, isErrorWithCode} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {ELEMENT_HEIGHT} from '../../styles/metrics';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {KeyboardAwareScrollView} from '../../components/common/KeyboardAwareScrollView';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';
import {hapticOptions} from '../../data/cycleTypes';
import {MenuAccordion, MenuGroup} from '../../components/common/cycleMenu';
import {COLORS, OutlineButton} from '../access/accessUi';
import {RowDivider, userStyles} from './user/userSettingsUi';
import {InfoBox} from '../../components/common/InfoBox';
import {RecoveryEmailRow, RecoveryEmailRowHandle} from './user/RecoveryEmailRow';
import {PasswordRow, PasswordRowHandle} from './user/PasswordRow';
import {
	ResetAccountSection,
	ResetAccountSectionHandle
} from './user/ResetAccountSection';

// User account: the box id in an info box, then, laid out like the cycle
// settings, one card of collapsible sections — Authentication & Security
// (recovery email and password, a toggle opens each edit form) and Reset
// (data/account erase) — then logout. The SVG debug picker
// (relocated from the former settings.tsx) only shows in dev builds.
// Les sections se déplient sur place : rien à faire au toucher.
const expandInline = () => undefined;

export function UserSettingsScreen(props: any) {
	const {t} = useTranslation(['settings', 'access']);
	const [login, setLogin] = useState('');
	// Nouvel email vérifié et/ou nouveau mot de passe confirmé : valider
	// apparaît en haut à droite.
	const emailRow = useRef<RecoveryEmailRowHandle>(null);
	const [emailDirty, setEmailDirty] = useState(false);
	const passwordRow = useRef<PasswordRowHandle>(null);
	const [passwordDirty, setPasswordDirty] = useState(false);
	// Réinitialisation cochée et login recopié : valider l'envoie aussi.
	const resetSection = useRef<ResetAccountSectionHandle>(null);
	const [resetDirty, setResetDirty] = useState(false);

	useEffect(() => {
		authenticationService.getCurrentUserName().then(name => setLogin(name ?? ''));
	}, []);

	const uploadSvgAndParseText = async (): Promise<string | null> => {
		try {
			// 1️⃣ Sélection du fichier SVG
			const res = await pick({
				type: [types.allFiles] // tu peux filtrer sur 'image/svg+xml' aussi
			});

			// 2️⃣ Lecture du contenu du fichier
			const fileUri = res[0].uri;

			// ⚠️ Différence Android / iOS
			let path = fileUri;
			if (fileUri.startsWith('content://')) {
				const destPath = `${RNFS.TemporaryDirectoryPath}/${res[0].name}`;
				await RNFS.copyFile(fileUri, destPath);
				path = destPath;
			}

			const svgText = await RNFS.readFile(path, 'utf8');

			// 3️⃣ Retour du contenu texte du SVG
			return svgText;
		} catch (err) {
			if (
				err instanceof Error &&
				isErrorWithCode(err) &&
				err.code === 'DOCUMENT_PICKER_CANCELED'
			) {
			} else {
				console.error('Erreur :', err);
			}
			return null;
		}
	};

	const [svgText, setSvgText] = useState('');

	const handleUpload = async () => {
		const text = await uploadSvgAndParseText();
		if (text) setSvgText(text);
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				),
			// Réinitialisation prête : elle passe en premier (elle rend le reste
			// sans objet). Sinon l'email d'abord (le code du mot de passe part
			// vers l'email de récupération), valider reste pour le mot de passe.
			headerRight: () =>
				resetDirty || emailDirty || passwordDirty
					? navigationHeader(
							() =>
								resetDirty
									? resetSection.current?.submit()
									: emailDirty
									? emailRow.current?.submit()
									: passwordRow.current?.submit(),
							'check-circle',
							false
						)
					: null
		});
	}, [resetDirty, emailDirty, passwordDirty]);

	return (
		// Le champ focus (et son message d'erreur) défile au-dessus du clavier.
		<KeyboardAwareScrollView contentContainerStyle={styles.container}>
			{/* Un tap hors des champs ferme le clavier. */}
			<Pressable
				style={styles.sections}
				accessible={false}
				onPress={Keyboard.dismiss}>
				{login ? (
					<InfoBox
						message={`${t('user.boxId')} : ${login}`}
						style={styles.boxId}
						textStyle={userStyles.label}
					/>
				) : null}
				<MenuGroup style={styles.card}>
					{login ? (
						<MenuAccordion
							key={2}
							name={t('user.security.title')}
							icon={faShieldHalved}
							defaultExpanded
							onPress={expandInline}>
							<View style={styles.sectionBody}>
								<RecoveryEmailRow
									ref={emailRow}
									login={login}
									onDirtyChange={setEmailDirty}
								/>
								<RowDivider />
								<PasswordRow
									ref={passwordRow}
									login={login}
									onDirtyChange={setPasswordDirty}
								/>
							</View>
						</MenuAccordion>
					) : null}
					{login ? (
						<MenuAccordion
							key={3}
							name={t('user.reset.title')}
							icon={faRotateLeft}
							// Section destructrice : en rouge, comme son bouton.
							color={COLORS.danger}
							onPress={expandInline}>
							<View style={styles.sectionBody}>
								<ResetAccountSection
									ref={resetSection}
									login={login}
									onDirtyChange={setResetDirty}
								/>
							</View>
						</MenuAccordion>
					) : null}
				</MenuGroup>
				<View style={styles.logout}>
					<OutlineButton
						label={t('menu.logout')}
						icon={faPowerOff}
						onPress={async () => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							await authenticationService.signout();
						}}
					/>
				</View>
				{__DEV__ ? (
					<>
						<Button title={t('chooseSvg')} onPress={handleUpload} />
						{svgText ? <Text selectable>{svgText}</Text> : null}
					</>
				) : null}
			</Pressable>
		</KeyboardAwareScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingVertical: 16
	},
	sections: {
		gap: 16
	},
	// Même carte que les réglages du cycle.
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.light,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	// Même hauteur que le bouton de déconnexion.
	boxId: {
		marginHorizontal: 20,
		height: ELEMENT_HEIGHT,
		paddingVertical: 0,
		justifyContent: 'center'
	},
	sectionBody: {
		paddingHorizontal: 16
	},
	logout: {
		alignItems: 'center'
	}
});

export default UserSettingsScreen;
