import React, {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {placeholderColor} from '../../styles/components/common/Input';
import {
	Keyboard,
	Modal,
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View
} from 'react-native';

export function ModalOverrideDuration({
	isOpen,
	onClose,
	onConfirm
}: {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (ms: number) => void;
}) {
	const {t} = useTranslation();
	const [text, setText] = useState('');
	// Durée validée, exécutée seulement une fois la modale réellement fermée :
	// dispatcher pendant l'animation de fermeture (clavier ouvert + re-render
	// du statut) laisse sur iOS une fenêtre modale invisible qui bloque tous
	// les touchers.
	const pendingMs = useRef<number | null>(null);

	const flushPending = () => {
		const ms = pendingMs.current;
		pendingMs.current = null;
		setText('');
		if (ms !== null) {
			onConfirm(ms);
		}
	};

	const confirm = () => {
		Keyboard.dismiss();
		pendingMs.current = Number(text);
		onClose();
		// onDismiss n'est fiable que sur iOS ; le Dialog Android n'a pas le
		// problème, on exécute directement.
		if (Platform.OS !== 'ios') {
			flushPending();
		}
	};

	const cancel = () => {
		Keyboard.dismiss();
		pendingMs.current = null;
		setText('');
		onClose();
	};

	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={cancel}
			onDismiss={flushPending}>
			<View
				style={{
					flex: 1,
					justifyContent: 'center',
					alignItems: 'center',
					backgroundColor: 'rgba(0,0,0,0.5)'
				}}>
				<View
					style={{
						backgroundColor: 'white',
						borderRadius: 12,
						padding: 20,
						width: '80%'
					}}>
					<Text
						style={{
							fontSize: 17,
							fontWeight: 'bold',
							marginBottom: 12
						}}>
						{t('overrideDuration.title')}
					</Text>
					<Text style={{marginBottom: 8}}>
						{t('overrideDuration.message')}
					</Text>
					<TextInput
						value={text}
						placeholderTextColor={placeholderColor}
						onChangeText={newText => setText(newText)}
						style={{
							borderWidth: 1,
							borderColor: '#CBD5E0',
							borderRadius: 6,
							paddingHorizontal: 12,
							paddingVertical: 8,
							marginBottom: 16
						}}
					/>
					<View
						style={{
							flexDirection: 'row',
							justifyContent: 'flex-end',
							gap: 8
						}}>
						<TouchableOpacity
							onPress={cancel}
							style={{paddingVertical: 8, paddingHorizontal: 16}}>
							<Text style={{color: '#718096'}}>{t('cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={confirm}
							style={{
								paddingVertical: 8,
								paddingHorizontal: 16,
								backgroundColor: '#3182CE',
								borderRadius: 6
							}}>
							<Text style={{color: 'white', fontWeight: 'bold'}}>
								{t('execute')}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
