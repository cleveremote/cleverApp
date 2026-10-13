import React from 'react';
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
	title = 'Confirmation required !',
	message = 'This action cannot be reversed. Deleted data can not be recovered.'
}: {
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	title?: string;
	message?: string;
}) {
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
							<Text style={{color: '#718096'}}>No</Text>
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
								Yes
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
