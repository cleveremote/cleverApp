import {Button, ScrollView, Switch, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {pick, types, isErrorWithCode} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {navigationHeader} from '../../components/common/navigationHeaders';

// Relocated from the former app-level SettingsScreen (settings.tsx): switch
// placeholder + SVG debug picker. Logout moved to the bottom of the settings
// sections (SettingsMenuScreen).
export function UserSettingsScreen(props: any) {
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
				)
		});
	}, []);

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
			<Button title="Choisir un SVG" onPress={handleUpload} />
			{svgText ? (
				<ScrollView style={{marginTop: 20}}>
					<Text selectable>{svgText}</Text>
				</ScrollView>
			) : null}
		</View>
	);
}

export default UserSettingsScreen;
