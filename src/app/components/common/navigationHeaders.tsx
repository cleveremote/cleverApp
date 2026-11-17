import React from 'react';
import {GestureResponderEvent, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Logo from '../../../../hydrophyto.svg';
import {directionalIcon} from '../../../i18n/rtl';

export function navigationHeader(
	onPress: (event: GestureResponderEvent) => void,
	icon: string,
	rotate = false,
	disabled = false
) {
	return rotate ? (
		<View>
			<TouchableOpacity
				style={{transform: [{rotate: '135deg'}]}}
				onPress={onPress}>
				<Icon name={directionalIcon(icon)} size={30} color="#32404e" style={{marginHorizontal: 10}}/>
			</TouchableOpacity>
		</View>
	) : (
		<View>
			<TouchableOpacity
				onPress={onPress}
				disabled={disabled}
				style={disabled ? {opacity: 0.3} : undefined}>
				<Icon name={directionalIcon(icon)} size={30} color="#32404e" style={{marginHorizontal: 10}} />
			</TouchableOpacity>
		</View>
	);
}

export function brandLogo(onPress?: any) {
	const handler = typeof onPress === 'function' ? onPress : undefined;
	if (handler) {
		return (
			<TouchableOpacity
				style={{marginHorizontal: 10}}
				onPress={handler}>
				<Logo width={'35'} height={'35'} />
			</TouchableOpacity>
		);
	}
	return (
		<View style={{marginHorizontal: 10}}>
			<Logo width={'35'} height={'35'} />
		</View>
	);
}
