import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppSwitch } from '../common/AppSwitch';
import { connect } from 'react-redux';
import { notificationMessage } from './CycleNotification';
import { useUnreachableDevices } from '../device/DeviceConnectivity';

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
	}, [props.status, props.cycleData.id]);
	// Tant que le bandeau CycleNotification est affiché, on passe par ses
	// actions : le toggle est bloqué.
	const hasNotification = !!notificationMessage(
		(props.status || []).find((x: any) => x?.id === props.cycleData.id),
		true,
		props.status
	);

	// Un device requis injoignable empêche le démarrage (cf. icône
	// DeviceDisconnectedIcon) ; un cycle en cours peut toujours être arrêté.
	const unreachable = useUnreachableDevices(props.cycleData, 'CYCLE');
	const locked =
		hasNotification || (!!unreachable.length && status !== 'IN_PROCCESS');

	return (
		<View style={{ alignItems: 'flex-end' }}>
			<AppSwitch
				disabled={locked}
				style={{ marginTop: 2, opacity: locked ? 0.4 : 1 }}
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
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(SensorStatus);
