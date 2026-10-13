import React, {useState} from 'react';
import {Pressable, Text, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {ModalConfirmation} from '../modalDelete';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../data/cycleTypes';

export function MenuAccordion({
	name,
	icon,
	color = '#32404e',
	isLast = false,
	closeSibillings,
	current,
	onPress,
	children,
	invalid = false
}: {
	name: string;
	icon: IconDefinition;
	color?: string;
	isLast?: boolean;
	closeSibillings?: Function;
	current?: string;
	onPress: Function;
	children?: React.ReactNode;
	// Encadre la section en rouge quand son sous-formulaire n'est pas conforme.
	invalid?: boolean;
}) {
	const [isExpanded, setExpended] = useState(false);

	// Section non conforme : icône + titre en rouge et mention « not valid ».
	const errorColor = '#E53E3E';
	const activeColor = invalid ? errorColor : color;

	return (
		<View>
			<Pressable
				onPress={() => {
					ReactNativeHapticFeedback.trigger(
						'impactMedium',
						hapticOptions
					);
					// Avec un contenu déplié, l'accordéon se déplie/replie inline
					// au lieu de déléguer la navigation.
					if (children) {
						setExpended(prev => !prev);
					}
					onPress();
				}}
				style={{height: 50, backgroundColor: 'white', borderRadius: 12}}>
				{({pressed}) => (
					<View
						style={{
							flex: 1,
							justifyContent: 'center',
							alignItems: 'center',
							flexDirection: 'row',
							transform: [{scale: pressed ? 0.99 : 1}],
							borderBottomColor:
								!isLast || isExpanded ? color : 'white',
							borderBottomWidth: !isLast || isExpanded ? 1 : 0
						}}>
						<View
							style={{
								marginLeft: 10,
								justifyContent: 'center',
								alignItems: 'center',
								flexDirection: 'row'
							}}>
							<View
								style={{
									width: 35,
									height: 35,
									borderRadius: 0.5 * 45,
									justifyContent: 'center',
									alignItems: 'center',
									borderColor: activeColor,
									borderWidth: 2.5
								}}>
								<FontAwesomeIcon
									icon={icon}
									size={20}
									color={activeColor}
								/>
							</View>
							<Text
								style={{
									fontWeight: 'bold',
									color: activeColor,
									fontSize: 15,
									marginLeft: 8
								}}>
								{' '}
								{name}{' '}
							</Text>
						</View>

						<View
							style={{
								flex: 1,
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'flex-end',
								marginRight: 20
							}}>
							{invalid ? (
								<Text
									style={{
										color: errorColor,
										fontSize: 12,
										fontWeight: 'bold',
										marginRight: 8
									}}>
									not valid
								</Text>
							) : null}
							<Icon
								name={
									isExpanded ? 'angle-down' : 'angle-right'
								}
								size={20}
								color={'grey'}
							/>
						</View>
					</View>
				)}
			</Pressable>
			{children && isExpanded ? <View>{children}</View> : null}
		</View>
	);
}

export function DeleteItemMenu({
	name = 'Remove',
	icon = faTrash,
	color = '#fb1900',
	isLast = true,
	onCancel = () => {},
	OnConfirm,
	confirmTitle,
	confirmMessage
}: {
	name?: string;
	icon?: IconDefinition;
	color?: string;
	isLast?: boolean;
	onCancel?: () => void;
	OnConfirm: () => void;
	confirmTitle?: string;
	confirmMessage?: string;
}) {
	const [isOpened, setOpened] = useState(false);
	// Appui long : ouvre une modal « Are you sure ? » (Yes / No).
	const onLongPress = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		setOpened(true);
	};
	return (
		<View>
			<Pressable
				onLongPress={onLongPress}
				style={{height: 55, backgroundColor: 'white', borderRadius: 12}}>
				{({pressed}) => (
					<View
						style={{
							flex: 1,
							justifyContent: 'center',
							alignItems: 'center',
							flexDirection: 'row',
							transform: [{scale: pressed ? 0.99 : 1}],
							borderBottomColor: !isLast ? color : 'white',
							borderBottomWidth: !isLast ? 1 : 0
						}}>
						<View
							style={{
								flex: 1,
								justifyContent: 'center',
								alignItems: 'center',
								flexDirection: 'row',
								marginLeft: 10
							}}>
							<View
								style={{
									width: 35,
									height: 35,
									borderRadius: 0.5 * 45,
									justifyContent: 'center',
									alignItems: 'center',
									borderColor: color,
									borderWidth: 2.5
								}}>
								<FontAwesomeIcon
									icon={icon}
									size={20}
									color={color}
								/>
							</View>
							<Text
								style={{
									flex: 1,
									fontWeight: 'bold',
									color: '#E53E3E',
									fontSize: 15,
									marginLeft: 8
								}}>
								{' '}
								{name}{' '}
							</Text>
							<Text
								style={{
									flex: 2,
									fontWeight: 'bold',
									color: '#E53E3E',
									fontSize: 10
								}}>
								{' '}
								(long press to remove){' '}
							</Text>
						</View>
					</View>
				)}
			</Pressable>
			<ModalConfirmation
				isOpen={isOpened}
				title={confirmTitle}
				message={confirmMessage}
				onClose={() => {
					onCancel();
					setOpened(false);
				}}
				onDelete={() => {
					setOpened(false);
					OnConfirm();
				}}
			/>
		</View>
	);
}
