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
	GROUPS_LOAD,
	DEVICE_MODELS_LOAD,
	CONTROL_LOOPS_LOAD,
	DEVICE_CONNECTIVITY_UPDATE,
	ACTUATORS_LOAD
} from './types';
import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {socketService, normalizeIds} from '../../../../../services/socket';
import {statusFromConfiguration} from './cycle';
import {parseConnectivity} from '../models/deviceConnectivity';
import {CONTROL_LOOPS_CONFIG_KEY} from '../../../../../app/data/controlLoopTypes';

export const listenerEvents =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.off('UPDATE_CONFIGURATION');
		socketService.off('front/synchronize/status');
		socketService.off('front/synchronize/sensor-value');
		socketService.off('server/front/box-status');
		socketService.off('front/synchronize/device-status');
		
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

			// Changement de joignabilité d'un master/slave, poussé par le box.
			socketService.on(
				'front/synchronize/device-status',
				message => {
					const entry = parseConnectivity(message);
					if (entry) {
						dispatch({
							type: DEVICE_CONNECTIVITY_UPDATE,
							payload: entry
						});
					}
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

// Global loader only while no plan is loaded yet.
export const loadPlan =
	(): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		await AsyncStorage.setItem('test_plan', ``);
		const plan = await AsyncStorage.getItem('test_plan');
		if (!plan) {
			socketService.emitRefresh(
				!!(getState() as any).root_cycle.plan,
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

// `silent` : pas de loader global, quand l'écran affiche déjà le sien.
export const loadConfiguration =
	(
		onDone?: () => void,
		silent = false
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		(silent ? socketService.emitSilent : socketService.emit).call(
			socketService,
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

				// TEMP diagnostic: which reload blanks the masters list.
				console.log(
					'[devices] loadConfiguration',
					(config.devices || []).filter((d: any) => d.type === 'MASTER').length
				);
				dispatch({
					type: ROOT_DEVICES_LOAD,
					payload: config.devices
				});

				// Nécessaires pour relier les séquences à leurs devices (cf.
				// deviceConnectivity). Le mock de loadActuators reste en place
				// tant que le box ne renvoie pas de liste.
				if (config.actuators?.length) {
					dispatch({
						type: ACTUATORS_LOAD,
						payload: config.actuators
					});
				}

				// Boucles de régulation des vannes CTRL : chargées dès le départ
				// pour les badges et la valeur CTRL des séquences. Clé absente :
				// on garde la liste déjà connue.
				if (Array.isArray(config[CONTROL_LOOPS_CONFIG_KEY])) {
					dispatch({
						type: CONTROL_LOOPS_LOAD,
						payload: config[CONTROL_LOOPS_CONFIG_KEY]
					});
				}

				dispatch({
					type: DEVICE_MODELS_LOAD,
					payload: config.models
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

				onDone?.();
			}
		);
	};
