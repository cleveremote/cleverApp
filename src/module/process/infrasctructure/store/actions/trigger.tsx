import {
	TRIGGERS_LOAD,
	TRIGGER_UPDATE,
	TRIGGER_LOAD,
	TRIGGER_SAVE,
	TRIGGERS_SAVE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {socketService} from '../../../../../services/socket';

export const updateTrigger =
	(
		trigger: any,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		await dispatch({
			type: TRIGGER_UPDATE,
			payload: trigger
		});
		onSuccess?.();
	};

export const loadTriggers =
	(triggerId: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: TRIGGERS_LOAD,
			payload: triggerId
		});
	};

export const loadTrigger =
	(
		triggerId: string,
		cycleId: string
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: TRIGGER_LOAD,
			payload: {triggerId, cycleId}
		});
	};

export const saveTrigger =
	(
		data: any,
		soft: boolean,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		if (soft) {
			dispatch({
				type: TRIGGER_SAVE,
				payload: data
			});
			onSuccess?.();
		} else {
			socketService.emit(
				'front/box/sync/trigger',
				data,
				(response: any) => {
					dispatch({
						type: TRIGGER_SAVE,
						payload: JSON.parse(response.config).trigger
					});
					onSuccess?.();
				}
			);
		}
	};

export const saveTriggers =
	(
		cycle: any,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/sync/cycle',
			cycle,
			async (response: any) => {
				await dispatch({
					type: TRIGGERS_SAVE,
					payload: JSON.parse(response.config).cycle?.triggers || []
				});
				onSuccess?.();
			}
		);
	};
