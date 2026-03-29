import React, {useState} from 'react';
import {placeholderColor} from '../../styles/components/common/Input';
import {
	Modal,
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
	const [text, setText] = useState('');
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
						Override duration
					</Text>
					<Text style={{marginBottom: 8}}>
						please enter duration in (ms) to override default
						sequences duration
					</Text>
					<TextInput
						defaultValue={text}
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
							onPress={onClose}
							style={{paddingVertical: 8, paddingHorizontal: 16}}>
							<Text style={{color: '#718096'}}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => onConfirm(Number(text))}
							style={{
								paddingVertical: 8,
								paddingHorizontal: 16,
								backgroundColor: '#3182CE',
								borderRadius: 6
							}}>
							<Text style={{color: 'white', fontWeight: 'bold'}}>
								execute
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
