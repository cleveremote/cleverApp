import React, {createContext, useContext, useState} from 'react';
import {Pressable, Text, View, ViewProps} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {ModalConfirmation} from '../modalDelete';
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../data/cycleTypes';

// Position d'un menu dans son MenuGroup : undefined hors groupe (la prop
// isLast fait alors foi).
const MenuIsLastContext = createContext<boolean | undefined>(undefined);

// Aplatit fragments / tableaux et ignore null, false, undefined pour ne garder
// que les menus réellement rendus.
function flattenMenuChildren(children: React.ReactNode): React.ReactElement[] {
	const out: React.ReactElement[] = [];
	React.Children.forEach(children, child => {
		if (!React.isValidElement(child)) return;
		if (child.type === React.Fragment) {
			out.push(
				...flattenMenuChildren(
					(child.props as {children?: React.ReactNode}).children
				)
			);
		} else {
			out.push(child);
		}
	});
	return out;
}

// Conteneur de MenuAccordion / DeleteItemMenu : indique automatiquement au
// dernier menu rendu qu'il est le dernier (pas de ligne de séparation en bas),
// y compris quand des menus apparaissent ou disparaissent dynamiquement.
export function MenuGroup({children, ...viewProps}: ViewProps) {
	const items = flattenMenuChildren(children);
	return (
		<View {...viewProps}>
			{items.map((item, i) => (
				<MenuIsLastContext.Provider
					key={item.key ?? i}
					value={i === items.length - 1}>
					{item}
				</MenuIsLastContext.Provider>
			))}
		</View>
	);
}

export function MenuAccordion({
	name,
	icon,
	color = '#32404e',
	isLast: isLastProp = false,
	closeSibillings,
	current,
	onPress,
	children,
	invalid = false,
	alwaysExpanded = false,
	defaultExpanded = false
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
	// Seul menu de l'accordéon : toujours déplié (pas de repli ni de chevron) et
	// sans ligne de séparation en bas.
	alwaysExpanded?: boolean;
	// Déplié à l'ouverture de l'écran, mais repliable.
	defaultExpanded?: boolean;
}) {
	const isLast = useContext(MenuIsLastContext) ?? isLastProp;
	const [expandedState, setExpended] = useState(defaultExpanded);
	const isExpanded = alwaysExpanded || expandedState;
	const showSeparator = !alwaysExpanded && (!isLast || isExpanded);

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
					if (alwaysExpanded) return;
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
							borderBottomColor: showSeparator ? color : 'white',
							borderBottomWidth: showSeparator ? 1 : 0
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
							{alwaysExpanded ? null : (
								<Icon
									name={
										isExpanded ? 'angle-down' : 'angle-right'
									}
									size={20}
									color={'grey'}
								/>
							)}
						</View>
					</View>
				)}
			</Pressable>
			{children && isExpanded ? (
				// Les menus imbriqués dans le contenu ne dépendent pas de ce groupe.
				<MenuIsLastContext.Provider value={undefined}>
					<View>{children}</View>
				</MenuIsLastContext.Provider>
			) : null}
		</View>
	);
}

export function DeleteItemMenu({
	name = 'Remove',
	icon = faTrash,
	color = '#fb1900',
	isLast: isLastProp = true,
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
	const isLast = useContext(MenuIsLastContext) ?? isLastProp;
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
