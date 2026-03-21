import React from 'react';
import {Text, View} from 'react-native';
import {connect} from 'react-redux';

export function SensorValue(props: any) {
	const fontColor = props.cycleData.style.fontColor;
	const getValue = () => {
		console.log('rops.cycleData', props.values);
		return (props.values || []).find(
			(x: any) =>
				x.id === props.cycleData.id || x.deviceId === props.cycleData.id
		);
	};
	return (
		<View
			style={{
				justifyContent: 'center',
				alignItems: 'flex-end',
				borderRadius: 12,
				height: 40,
				width: 60,
				elevation: 6,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 3},
				shadowOpacity: 0.27,
				shadowRadius: 4.65
			}}>
			<Text
				style={{
					fontWeight: 'bold',
					alignSelf: 'center',
					color: fontColor
				}}>
				{getValue()?.value || '_  '}
				{props.cycleData.unit}
			</Text>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	values: state.root_sensor.values
});

export default connect(mapStateToProps, null)(SensorValue);
