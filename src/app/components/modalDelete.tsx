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
	onDelete
}: {
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
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
						Delete Cycle
					</Text>
					<Text style={{marginBottom: 20}}>
						This will remove the cycle. This action cannot be
						reversed. Deleted data can not be recovered.
					</Text>
					<View
						style={{
							flexDirection: 'row',
							justifyContent: 'flex-end',
							gap: 8
						}}>
						<TouchableOpacity
							onPress={onClose}
							style={{paddingVertical: 8, paddingHorizontal: 16}}>
							<Text style={{color: '#718096'}}>Cancel</Text>
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
								Delete
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
