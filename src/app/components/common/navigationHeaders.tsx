import React from 'react';
import {GestureResponderEvent, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Logo from '../../../../hydrophyto.svg';

export function navigationHeader(
	onPress: (event: GestureResponderEvent) => void,
	icon: string,
	rotate = false
) {
	return rotate ? (
		<View>
			<TouchableOpacity
				style={{transform: [{rotate: '135deg'}]}}
				onPress={onPress}>
				<Icon name={icon} size={30} color="#32404e" style={{marginHorizontal: 10}}/>
			</TouchableOpacity>
		</View>
	) : (
		<View>
			<TouchableOpacity onPress={onPress}>
				<Icon name={icon} size={30} color="#32404e" style={{marginHorizontal: 10}} />
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
