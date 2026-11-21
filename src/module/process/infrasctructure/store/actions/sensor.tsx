import {
	SENSORS_LOAD,
	SENSOR_LOAD,
	SENSOR_SAVE,
	SENSOR_STATUS,
	SENSOR_UPDATE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds,
	isTempId
} from '../../../../../services/socket';

export const updateSensor =
	(sensor: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SENSOR_UPDATE,
			payload: sensor
		});
	};

export const loadSensors =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				dispatch({
					type: SENSORS_LOAD,
					payload: normalizeIds(JSON.parse(response.config).sensors)
				});
				dispatch({
					type: SENSOR_STATUS,
					payload: normalizeIds(JSON.parse(response.config).values)
				});
			}
		);
	};

export const loadSensor =
	(sensorId: string): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SENSOR_LOAD,
			payload: sensorId
		});
	};

export const saveSensor =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		// Un sensor (parent ou enfant) est toujours affiché à sa création ; il
		// ne peut être masqué qu'ensuite, depuis la visibilité des appareils.
		const isNew = data.id == null || isTempId(data.id);
		socketService.emit(
			'front/box/sync/sensor',
			denormalizeIds(isNew ? {...data, display: true} : data),
			(response: any) => {
				dispatch({
					type: SENSOR_SAVE,
					payload: normalizeIds(JSON.parse(response.config).sensor),
					tempId: isTempId(data.id) ? data.id : undefined
				});
			}
		);
	};
