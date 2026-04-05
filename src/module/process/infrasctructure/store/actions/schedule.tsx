import {
	SCHEDULES_LOAD,
	SCHEDULE_UPDATE,
	SCHEDULE_LOAD,
	SCHEDULE_SAVE,
	SCHEDULES_SAVE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {socketService} from '../../../../../services/socket';

export const updateSchedule =
	(
		schedule: any,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		await dispatch({
			type: SCHEDULE_UPDATE,
			payload: schedule
		});
		onSuccess?.();
	};

export const loadSchedules =
	(cycle: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SCHEDULES_LOAD,
			payload: cycle
		});
	};

export const loadSchedule =
	(
		scheduleId: string,
		cycleId: string
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SCHEDULE_LOAD,
			payload: {scheduleId, cycleId}
		});
	};

export const saveSchedule =
	(
		data: any,
		soft: boolean,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		if (soft) {
			await dispatch({
				type: SCHEDULE_SAVE,
				payload: data
			});
			onSuccess?.();
		} else {
			socketService.emit(
				'front/box/sync/schedule',
				data,
				async (response: any) => {
					await dispatch({
						type: SCHEDULE_SAVE,
						payload: JSON.parse(response.config).schedule
					});
					onSuccess?.();
				}
			);
		}
	};

export const saveSchedules =
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
					type: SCHEDULES_SAVE,
					payload: JSON.parse(response.config).cycle?.schedules || []
				});
				onSuccess?.();
			}
		);
	};
