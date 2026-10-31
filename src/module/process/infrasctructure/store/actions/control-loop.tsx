import {
	CONTROL_LOOPS_LOAD,
	CONTROL_LOOP_SAVE,
	CONTROL_LOOP_UPDATE
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
import {
	CONTROL_LOOPS_CONFIG_KEY,
	SYNC_CONTROL_LOOP_EVENT
} from '../../../../../app/data/controlLoopTypes';

// Boucles de régulation des vannes CTRL, au premier niveau de la configuration
// box (même niveau que `actuators`). Rechargées à chaque ouverture : loader
// global seulement tant que la liste est vide.
export const loadControlLoops =
	(): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		socketService.emitRefresh(
			!!getState().root_control_loop.loops?.length,
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				let loops;
				try {
					loops = JSON.parse(response.config)[CONTROL_LOOPS_CONFIG_KEY];
				} catch {
					loops = undefined;
				}
				if (!Array.isArray(loops)) return;
				dispatch({
					type: CONTROL_LOOPS_LOAD,
					payload: normalizeIds(loops)
				});
			}
		);
	};

// Boucle en cours d'édition dans les réglages d'une vanne.
export const updateControlLoop =
	(loop: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({type: CONTROL_LOOP_UPDATE, payload: loop});
	};

// Persiste une boucle (création, modification ou suppression via `delete`) :
// mise à jour optimiste de la liste, puis réalignement sur la boucle renvoyée.
export const saveControlLoop =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		const tempId = isTempId(data.id) ? data.id : undefined;
		const {isModified, ...persisted} = data;
		dispatch({type: CONTROL_LOOP_SAVE, payload: persisted});
		socketService.emit(
			SYNC_CONTROL_LOOP_EVENT,
			denormalizeIds(persisted),
			(response: any) => {
				let saved;
				try {
					saved = normalizeIds(JSON.parse(response.config).controlLoop);
				} catch {
					saved = undefined;
				}
				if (!saved) return;
				dispatch({type: CONTROL_LOOP_SAVE, payload: saved, tempId});
			}
		);
	};
