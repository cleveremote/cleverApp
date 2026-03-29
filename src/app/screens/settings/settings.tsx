import {Button, Platform, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';
import { pick, types, isErrorWithCode } from '@react-native-documents/picker'
import RNFS from 'react-native-fs';
import {useState} from 'react';
import { Switch } from 'react-native';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

const hapticTriggerType: string = Platform.select({
	ios: 'notificationSuccess',
	android: 'impactMedium'
}) as string;

export function SettingsScreen(props: any) {
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
			if (err instanceof Error && isErrorWithCode(err) && err.code === 'DOCUMENT_PICKER_CANCELED') {
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

	return (
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
					height: '50%'
				}}>
					<Switch
					    ios_backgroundColor={'red'}
						value={true}
						onValueChange={() => {}}
							
					/>
				<View style={{marginLeft: 40, marginRight: 40, marginBottom: 20, alignSelf: 'center'}}>
					<TouchableOpacity
						style={{alignSelf: 'center'}}
						onPress={async () => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							await authenticationService.signout();
						}}>
						<Icon name="sign-out-alt" size={25} color="#32404e" />
					</TouchableOpacity>
					<Text style={{color: '#32404e', fontSize: 15}}>logout</Text>
				</View>
				<Button title="Choisir un SVG" onPress={handleUpload} />
				{svgText ? (
					<ScrollView style={{marginTop: 20}}>
						<Text selectable>{svgText}</Text>
					</ScrollView>
				) : null}
			</View>
	);
}
