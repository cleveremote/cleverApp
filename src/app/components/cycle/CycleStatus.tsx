import React, {useEffect, useState} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {AppSwitch} from '../common/AppSwitch';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {hapticOptions} from '../../data/cycleTypes';
import {connect} from 'react-redux';

export function SensorStatus(props: any) {
	const [status, setStatus] = useState('');

	const getStatus = () => {
		const st = (props.status || []).find(
			(x: any) => x.id === props.cycleData.id
		);
		if (st) {
			return st.status;
		}
		return '';
	};

	useEffect(() => {
		setStatus(getStatus());
		props.closeSibillings(true);
	}, [props.status]);
	return (
		<View style={{alignItems: 'flex-end'}}>
			{status === 'WAITTING_CONFIRMATION' ? (
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						gap: 12
					}}>
					<TouchableOpacity
						onLongPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.onSwitch(true, 'FORCE');
						}}
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
						}}>
						<Icon name="check-circle" size={25} color="green" />
					</TouchableOpacity>
					<TouchableOpacity
						onLongPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.onSwitch(false, 'IGNORE');
						}}>
						<Icon name="times-circle" size={25} color="red" />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
						}}>
						<Icon
							name="arrow-alt-circle-right"
							size={25}
							color="orange"
						/>
					</TouchableOpacity>
				</View>
			) : (
				<AppSwitch
					style={{marginTop: 2}}
					value={status === 'IN_PROCCESS'}
					trackColor={{
						true: props.iconColorSwitch,
						false: '#d1d1d6'
					}}
					onValueChange={value => {
						props.closeSibillings(true);
						props.onSwitch(value, 'INIT');
						setStatus(value ? 'IN_PROCCESS' : 'STOPPED');
					}}
				/>
			)}
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(SensorStatus);
