import React from 'react';
import {Text} from 'react-native';
import {connect} from 'react-redux';

export function SensorValue(props: any) {
	const fontColor = props.cycleData.style.fontColor;
	const getValue = () => {
		return (props.values || []).find(
			(x: any) =>
				x.id === props.cycleData.id || x.deviceId === props.cycleData.id
		);
	};
	return (
		<Text
			style={{
				fontWeight: 'bold',
				fontSize: 20,
				color: fontColor,
				textShadowColor: '#737171',
				textShadowOffset: {width: 1, height: 0},
				textShadowRadius: 1
			}}>
			{getValue()?.value || '_  '}
			{props.cycleData.unit}
		</Text>
	);
}

const mapStateToProps = (state: any) => ({
	values: state.root_sensor.values
});

export default connect(mapStateToProps, null)(SensorValue);
