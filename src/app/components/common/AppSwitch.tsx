import React from 'react';
import {Platform, Switch, SwitchProps} from 'react-native';

const DEFAULT_TRACK_COLOR = {true: '#32404e', false: '#d1d1d6'};

const switchTransform =
	Platform.OS === 'android'
		? [{scaleX: 1.1}, {scaleY: 1.1}]
		: [{scaleX: 0.85}, {scaleY: 0.85}];

export function AppSwitch({style, ...props}: SwitchProps) {
	return (
		<Switch
			thumbColor="#ffffff"
			ios_backgroundColor="#d1d1d6"
			trackColor={DEFAULT_TRACK_COLOR}
			{...props}
			style={[{transform: switchTransform}, style]}
		/>
	);
}
