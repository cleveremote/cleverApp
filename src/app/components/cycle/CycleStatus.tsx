import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AppSwitch } from '../common/AppSwitch';
import { connect } from 'react-redux';
import { notificationMessage } from './CycleNotification';
import { useUnreachableDevices } from '../device/DeviceConnectivity';

// Au-delà, on se recale sur le status du box même sans confirmation (commande
// refusée ou perdue).
const PENDING_TIMEOUT_MS = 5000;

export function SensorStatus(props: any) {
	// Valeur demandée par l'utilisateur, en attente de confirmation du box. Un
	// arrêt pousse d'abord le STOPPED de la séquence en cours, le cycle restant
	// IN_PROCCESS un instant : sans ça le switch se rallumait avant de
	// s'éteindre pour de bon.
	const [pending, setPending] = useState<boolean | null>(null);

	const getStatus = () => {
		const st = (props.status || []).find(
			(x: any) => x.id === props.cycleData.id
		);
		if (st) {
			return st.status;
		}
		return '';
	};
	const storeStatus = getStatus();
	const storeRunning = storeStatus === 'IN_PROCCESS';

	useEffect(() => {
		props.closeSibillings(true);
	}, [props.status, props.cycleData.id]);

	useEffect(() => {
		if (pending !== null && pending === storeRunning) {
			setPending(null);
		}
	}, [pending, storeRunning]);

	useEffect(() => {
		if (pending === null) {
			return;
		}
		const timer = setTimeout(() => setPending(null), PENDING_TIMEOUT_MS);
		return () => clearTimeout(timer);
	}, [pending]);

	const status =
		pending === null ? storeStatus : pending ? 'IN_PROCCESS' : 'STOPPED';

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
					setPending(value);
				}}
			/>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(SensorStatus);
