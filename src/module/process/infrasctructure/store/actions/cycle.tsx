import {
	CYCLES_LOAD,
	CYCLE_UPDATE,
	CYCLE_LOAD,
	CYCLE_SAVE,
	CYCLE_STATUS,
	CYCLE_EXECUTE,
	DATA_LOAD,
	TASKS_LOAD,
	TASK_SAVE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {socketService} from '../../../../../services/socket';

export const listenerEvents =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.on('UPDATE_CONFIGURATION', message => {
			dispatch({
				type: CYCLE_SAVE,
				payload: JSON.parse(message).cycle
			});
		});
	};

export const updateCycle =
	(
		cycle: any,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		await dispatch({
			type: CYCLE_UPDATE,
			payload: cycle
		});
		onSuccess?.();
	};

export const loadValues =
	(
		type: string,
		query?: any
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		//dispatch({ type: CYCLE_EXECUTE, payload: true });
		socketService.emit(
			'front/box/fetch/status',
			{type, query},
			(response: any) => {
				//dispatch({ type: CYCLE_EXECUTE, payload: false });
				if (type !== 'DATA') {
					dispatch({
						type: CYCLE_STATUS,
						payload: JSON.parse(response.config)
					});
				} else {
					dispatch({
						type: DATA_LOAD,
						payload: JSON.parse(response.config)
					});
				}
			}
		);
	};

export const loadCycles =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				dispatch({
					type: CYCLES_LOAD,
					payload: JSON.parse(response.config).cycles
				});
			}
		);
	};

export const loadCycle =
	(cycleId: string): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: CYCLE_LOAD,
			payload: cycleId
		});
	};

export const loadTasks =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				const config = JSON.parse(response.config);
				dispatch({
					type: CYCLES_LOAD,
					payload: config.cycles
				});
				dispatch({
					type: TASKS_LOAD,
					payload: config.tasks
				});
			}
		);
	};

export const saveCycle =
	(
		data: any,
		soft = false,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		if (soft) {
			await dispatch({
				type: CYCLE_SAVE,
				payload: data
			});
			onSuccess?.();
		} else {
			socketService.emit(
				'front/box/sync/cycle',
				data,
				async (response: any) => {
					await dispatch({
						type: CYCLE_SAVE,
						payload: JSON.parse(response.config).cycle
					});
					onSuccess?.();
				}
			);
		}
	};

// Loads a task into the shared editing slice (state.root_cycle.cycle) so the
// existing cycle settings screens can edit it.
export const loadTask =
	(taskId: string): ThunkAction<void, RootState, unknown, AnyAction> =>
	(dispatch, getState) => {
		const task = ((getState() as any).root_cycle.tasks as any[]).find(
			(x: any) => x.id === taskId
		);
		dispatch({
			type: CYCLE_UPDATE,
			payload: task
		});
	};

export const saveTask =
	(
		data: any,
		soft = false,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		if (soft) {
			await dispatch({
				type: TASK_SAVE,
				payload: data
			});
			onSuccess?.();
		} else {
			socketService.emit(
				'front/box/sync/task',
				data,
				async (response: any) => {
					await dispatch({
						type: TASK_SAVE,
						payload: JSON.parse(response.config).task
					});
					onSuccess?.();
				}
			);
		}
	};

export const executeCycle =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		dispatch({type: CYCLE_EXECUTE, payload: true});
		return new Promise((resolve, reject) => {
			if (!socketService.connected) {
				reject(new Error('No server connexion!'));
			}

			socketService.emit(
				'front/box/execute/process',
				data,
				(response: any) => {
					dispatch({type: CYCLE_EXECUTE, payload: false});
					resolve(response);
				}
			);
		});
	};
