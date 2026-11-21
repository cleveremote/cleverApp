import React from 'react';
import i18n from 'i18next';
import {useTranslation} from 'react-i18next';
import {
	Modal,
	Text,
	TouchableOpacity,
	View
} from 'react-native';

export function ModalConfirmation({
	isOpen,
	onClose,
	onDelete,
	title = i18n.t('common:confirm.title'),
	message = i18n.t('common:confirm.irreversible')
}: {
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	title?: string;
	message?: string;
}) {
	const {t} = useTranslation();
	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={onClose}>
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
						{title}
					</Text>
					<Text style={{marginBottom: 20}}>{message}</Text>
					<View
						style={{
							flexDirection: 'row',
							justifyContent: 'flex-end',
							gap: 8
						}}>
						<TouchableOpacity
							onPress={onClose}
							style={{paddingVertical: 8, paddingHorizontal: 16}}>
							<Text style={{color: '#718096'}}>{t('no')}</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={onDelete}
							style={{
								paddingVertical: 8,
								paddingHorizontal: 16,
								backgroundColor: '#E53E3E',
								borderRadius: 6
							}}>
							<Text style={{color: 'white', fontWeight: 'bold'}}>
								{t('yes')}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
