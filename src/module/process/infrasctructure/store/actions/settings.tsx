import {SETTINGS_LOAD, SETTINGS_SAVE, SETTINGS_UPDATE} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds
} from '../../../../../services/socket';

/**
 * Box-level settings (currently only `localCoordinates`).
 *
 * Same socket contract as the other entities: the router answers with
 * `{config: <json string>}`. The settings payload may come either wrapped
 * (`{settings: {...}}`, like the sync routes do for cycle/sensor/...) or bare,
 * so both shapes are accepted here.
 */
const parseSettings = (response: any): any | undefined => {
	try {
		const raw = response?.config;
		if (raw === undefined || raw === null) return undefined;
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
		return normalizeIds(parsed?.settings ?? parsed);
	} catch (error) {
		console.warn('Unable to parse settings response', error);
		return undefined;
	}
};

export const updateSettings =
	(settings: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: SETTINGS_UPDATE,
			payload: settings
		});
	};

export const loadSettings =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit('front/box/fetch/settings', {}, (response: any) => {
			const settings = parseSettings(response);
			if (!settings) return;
			dispatch({
				type: SETTINGS_LOAD,
				payload: settings
			});
		});
	};

// `done` lets the caller react to the box answer (leave the screen, drop the
// spinner...). It is always called, even when the box sends nothing back, so a
// screen never stays stuck waiting.
export const saveSettings =
	(
		data: any,
		done?: (settings: any) => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/sync/settings',
			denormalizeIds(data),
			(response: any) => {
				const settings = parseSettings(response);
				dispatch({
					type: SETTINGS_SAVE,
					payload: settings ?? data
				});
				done?.(settings ?? data);
			}
		);
	};
