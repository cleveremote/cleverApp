import {
	SENSOR_UPDATE,
	CYCLE_UPDATE,
	SET_BOX_CONNECTED,
	CYCLE_STATUS,
	SENSOR_STATUS,
	CYCLES_LOAD,
	SENSORS_LOAD,
	CYCLE_SAVE,
	SENSOR_SAVE,
	PLAN_LOAD,
	MODBUS_CONNECTIONS_LOAD,
	MODBUS_TASKS_LOAD,
	ROOT_DEVICES_LOAD,
	GROUPS_LOAD
} from './types';
import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {socketService, normalizeIds} from '../../../../../services/socket';
import {statusFromConfiguration} from './cycle';

export const listenerEvents =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.off('UPDATE_CONFIGURATION');
		socketService.off('front/synchronize/status');
		socketService.off('front/synchronize/sensor-value');
		socketService.off('server/front/box-status');
		
			socketService.on(
				'UPDATE_CONFIGURATION',
				message => {
					const data = normalizeIds(JSON.parse(message));
					if (data.cycle) {
						dispatch({
							type: CYCLE_SAVE,
							payload: data.cycle
						});
					}

					if (data.sensor) {
						dispatch({
							type: SENSOR_SAVE,
							payload: data.sensor
						});
					}
				}
			);

			socketService.on(
				'front/synchronize/status',
				message => {
					const data = normalizeIds(JSON.parse(message));
					dispatch({
						type: CYCLE_STATUS,
						payload: data
					});
				}
			);

			socketService.on(
				'front/synchronize/sensor-value',
				message => {
					dispatch({
						type: SENSOR_STATUS,
						payload: normalizeIds(JSON.parse(message))
					});
				}
			);

			socketService.on(
				'server/front/box-status',
				message => {
					const res = JSON.parse(message).data === 'connected';
					dispatch({
						type: SET_BOX_CONNECTED,
						payload: res
					});
				}
			);
		
	};

// export const loadPlan = (): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
//     socketService.emit('front/box/fetch/configuration', {plan:123}, (response: any) => {
//         dispatch({
//             type: PLAN_LOAD,
//             payload: response.config,
//         });
//     });
// };

export const loadPlan =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		await AsyncStorage.setItem('test_plan', ``);
		const plan = await AsyncStorage.getItem('test_plan');
		if (!plan) {
			socketService.emit(
				'front/box/fetch/configuration',
				{plan: 123},
				async (response: any) => {
					await AsyncStorage.setItem('test_plan', response.config);
					dispatch({
						type: PLAN_LOAD,
						payload: response.config
					});
				}
			);
		} else {
			dispatch({
				type: PLAN_LOAD,
				payload: plan
			});
		}
	};

export const loadConfiguration =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				const config = normalizeIds(JSON.parse(response.config));

				dispatch({
					type: CYCLES_LOAD,
					payload: config.cycles
				});

				dispatch({
					type: GROUPS_LOAD,
					payload: (config.cycles || []).filter(
						(x: any) => x.type === 'GROUP'
					)
				});

				dispatch({
					type: SENSORS_LOAD,
					payload: config.sensors
				});

				dispatch({
					type: MODBUS_CONNECTIONS_LOAD,
					payload: config.modbusconnections
				});

				dispatch({
					type: MODBUS_TASKS_LOAD,
					payload: config.modbusTasks
				});

				dispatch({
					type: ROOT_DEVICES_LOAD,
					payload: config.devices
				});

				dispatch({
					type: SENSOR_STATUS,
					payload: config.values
				});

				// Pendant des `config.values` pour les capteurs : le status
				// d'exécution des cycles/séquences est porté par la configuration
				// elle-même, il alimente la tranche `root_cycle.status`.
				dispatch({
					type: CYCLE_STATUS,
					payload: statusFromConfiguration(config.cycles),
					replace: true
				});
			}
		);
	};
