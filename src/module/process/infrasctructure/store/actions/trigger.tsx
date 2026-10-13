import {
	TRIGGERS_LOAD,
	TRIGGER_UPDATE,
	TRIGGER_LOAD,
	TRIGGER_SAVE,
	TRIGGERS_SAVE
} from './types';

import {Alert} from 'react-native';
import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds,
	isTempId
} from '../../../../../services/socket';

// Le serveur renvoie `{ res: false, error: error.message }` lorsqu'un appel
// échoue. On considère aussi une réponse absente comme une erreur.
const isErrorResponse = (response: any) => !response || response.res === false;

// Affiche une modal avec le message d'erreur et notifie l'appelant via onError.
const notifyError = (message: string, onError?: (error: string) => void) => {
	const finalMessage = message || 'An unexpected error occurred.';
	Alert.alert('Error', finalMessage);
	onError?.(finalMessage);
};

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
		onSuccess?: () => void,
		onError?: (error: string) => void
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
				denormalizeIds(data),
				(response: any) => {
					if (isErrorResponse(response)) {
						notifyError(response?.error, onError);
						return;
					}
					try {
						dispatch({
							type: TRIGGER_SAVE,
							payload: normalizeIds(
								JSON.parse(response.config).trigger
							),
							tempId: isTempId(data.id) ? data.id : undefined
						});
						onSuccess?.();
					} catch (error: any) {
						notifyError(error?.message, onError);
					}
				}
			);
		}
	};

export const saveTriggers =
	(
		cycle: any,
		onSuccess?: () => void,
		onError?: (error: string) => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/sync/cycle',
			denormalizeIds(cycle),
			async (response: any) => {
				if (isErrorResponse(response)) {
					notifyError(response?.error, onError);
					return;
				}
				try {
					await dispatch({
						type: TRIGGERS_SAVE,
						payload:
							normalizeIds(
								JSON.parse(response.config).cycle?.triggers
							) || []
					});
					onSuccess?.();
				} catch (error: any) {
					notifyError(error?.message, onError);
				}
			}
		);
	};
