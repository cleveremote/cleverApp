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
				<Icon name={icon} size={30} color="#32404e" />
			</TouchableOpacity>
		</View>
	) : (
		<View>
			<TouchableOpacity onPress={onPress}>
				<Icon name={icon} size={30} color="#32404e" />
			</TouchableOpacity>
		</View>
	);
}

export function brandLogo() {
	return (
		<View>
			<Logo width={'35'} height={'35'} />
		</View>
	);
}
