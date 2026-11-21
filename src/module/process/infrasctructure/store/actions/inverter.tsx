import {INVERTER_SAVE} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds
} from '../../../../../services/socket';
import {isErrorResponse} from '../../../../../services/socket/responseErrors';
import {
	INVERTER_RESPONSE_KEY,
	SYNC_INVERTER_EVENT
} from '../../../../../app/data/inverterTypes';

// Persiste la configuration d'un variateur (mode par défaut, délai de relâche,
// valeurs imposées des paramètres ; `value: null` = plus imposée). La box
// réécrit sur l'appareil les seuls paramètres qui diffèrent. Mise à jour
// optimiste de la liste, puis réalignement sur le variateur renvoyé ; refus de
// la box (valeur hors plage…) : la popin d'erreur s'affiche et la liste
// reprend le variateur d'origine.
export const saveInverter =
	(
		inverter: any,
		payload: {
			defaultMode?: string;
			releaseGraceMs?: number;
			parameters: {blockId: string; value: number | null}[];
			// caractéristique par entrée (null : supprimée) ; entrée absente : inchangée
			analogInputs?: Record<string, any>;
		}
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		const values = new Map(
			payload.parameters.map(p => [p.blockId, p.value])
		);
		dispatch({
			type: INVERTER_SAVE,
			payload: {
				...inverter,
				defaultMode: payload.defaultMode ?? inverter.defaultMode,
				releaseGraceMs:
					payload.releaseGraceMs ?? inverter.releaseGraceMs,
				analogInputs: Object.fromEntries(
					Object.entries({
						...(inverter.analogInputs ?? {}),
						...(payload.analogInputs ?? {})
					}).filter(([, sensor]) => sensor)
				),
				parameters: (inverter.parameters ?? []).map((p: any) =>
					values.has(p.blockId)
						? {...p, value: values.get(p.blockId) ?? undefined}
						: p
				)
			}
		});
		socketService.emit(
			SYNC_INVERTER_EVENT,
			denormalizeIds({id: inverter.id, ...payload}),
			(response: any) => {
				let saved;
				try {
					if (isErrorResponse(response)) throw new Error('rejected');
					saved = normalizeIds(
						JSON.parse(response.config)[INVERTER_RESPONSE_KEY]
					);
				} catch {
					saved = undefined;
				}
				dispatch({
					type: INVERTER_SAVE,
					payload: saved?.id ? saved : inverter
				});
			}
		);
	};
