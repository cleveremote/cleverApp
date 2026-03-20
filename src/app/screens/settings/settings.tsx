import {IconButton, VStack, View} from 'native-base';
import {GluestackUIProvider} from '@gluestack-ui/themed-native-base';
import {Button, Platform, ScrollView, Text} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import {useState} from 'react';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

const hapticTriggerType: string = Platform.select({
	ios: 'notificationSuccess',
	android: 'impactMedium'
}) as string;

export function SettingsScreen(props: any) {
	const uploadSvgAndParseText = async (): Promise<string> => {
		try {
			// 1️⃣ Sélection du fichier SVG
			const res = await DocumentPicker.pickSingle({
				type: [DocumentPicker.types.allFiles] // tu peux filtrer sur 'image/svg+xml' aussi
			});

			// 2️⃣ Lecture du contenu du fichier
			const fileUri = res.uri;

			// ⚠️ Différence Android / iOS
			let path = fileUri;
			if (fileUri.startsWith('content://')) {
				const destPath = `${RNFS.TemporaryDirectoryPath}/${res.name}`;
				await RNFS.copyFile(fileUri, destPath);
				path = destPath;
			}

			const svgText = await RNFS.readFile(path, 'utf8');

			// 3️⃣ Retour du contenu texte du SVG
			console.log('Contenu du SVG :', svgText);

			return svgText;
		} catch (err) {
			if (DocumentPicker.isCancel(err)) {
				console.log('Sélection annulée');
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
		<GluestackUIProvider>
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
					height: '50%'
				}}>
				<VStack
					marginLeft="10"
					marginRight="10"
					marginBottom={5}
					alignSelf="center">
					<IconButton
						_pressed={{_icon: {size: 35}}}
						variant="unstyled"
						alignSelf="center"
						size={30}
						icon={
							<Icon
								name="sign-out-alt"
								size={25}
								color="#32404e"
							/>
						}
						onPress={async () => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							await authenticationService.signout();
						}}
					/>
					<Text style={{color: '#32404e', fontSize: 15}}>logout</Text>
				</VStack>
				<Button title="Choisir un SVG" onPress={handleUpload} />
				{svgText ? (
					<ScrollView style={{marginTop: 20}}>
						<Text selectable>{svgText}</Text>
					</ScrollView>
				) : null}
			</View>
		</GluestackUIProvider>
	);
}
