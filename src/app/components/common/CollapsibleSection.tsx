import React, {useState} from 'react';
import {
	LayoutAnimation,
	Platform,
	Pressable,
	Text,
	UIManager,
	View
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {IconDefinition} from '@fortawesome/fontawesome-svg-core';
import {hapticOptions} from '../../data/cycleTypes';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Inline accordion: a tappable header (title + chevron) that expands to reveal
// its children in place. Mirrors the visual style of `MenuAccordion` but hosts
// content instead of navigating away. When `badge` is a positive number, a pill
// is rendered next to the title so the count is visible while collapsed.
export function CollapsibleSection({
	title,
	icon,
	color = '#32404e',
	initiallyExpanded = false,
	badge,
	children
}: {
	title: string;
	icon?: IconDefinition;
	color?: string;
	initiallyExpanded?: boolean;
	badge?: number;
	children: React.ReactNode;
}) {
	const [isExpanded, setExpanded] = useState(initiallyExpanded);

	const toggle = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setExpanded(prev => !prev);
	};

	return (
		<View
			style={{
				alignSelf: 'stretch',
				backgroundColor: 'white',
				borderRadius: 12,
				marginVertical: 4,
				elevation: 3,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 1},
				shadowOpacity: 0.22,
				shadowRadius: 2.22
			}}>
			<Pressable
				onPress={toggle}
				style={{height: 50, backgroundColor: 'white', borderRadius: 12}}>
				{({pressed}) => (
					<View
						style={{
							flex: 1,
							justifyContent: 'center',
							alignItems: 'center',
							flexDirection: 'row',
							transform: [{scale: pressed ? 0.99 : 1}],
							borderBottomColor: isExpanded ? color : 'white',
							borderBottomWidth: isExpanded ? 1 : 0
						}}>
						<View
							style={{
								marginLeft: 10,
								justifyContent: 'center',
								alignItems: 'center',
								flexDirection: 'row'
							}}>
							{icon ? (
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
							) : null}
							<Text
								style={{
									fontWeight: 'bold',
									color: color,
									fontSize: 15,
									marginLeft: 8
								}}>
								{' '}
								{title}{' '}
							</Text>
							{badge ? (
								<View
									style={{
										minWidth: 22,
										height: 22,
										borderRadius: 11,
										paddingHorizontal: 6,
										justifyContent: 'center',
										alignItems: 'center',
										backgroundColor: color
									}}>
									<Text
										style={{
											color: 'white',
											fontSize: 12,
											fontWeight: 'bold'
										}}>
										{badge}
									</Text>
								</View>
							) : null}
						</View>

						<View
							style={{
								flex: 1,
								alignItems: 'flex-end',
								marginRight: 20
							}}>
							<Icon
								name={isExpanded ? 'angle-down' : 'angle-right'}
								size={20}
								color={'grey'}
							/>
						</View>
					</View>
				)}
			</Pressable>
			{isExpanded ? (
				<View style={{padding: 8}}>{children}</View>
			) : null}
		</View>
	);
}
