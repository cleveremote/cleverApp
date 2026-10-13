import {
	CYCLES_LOAD,
	CYCLE_UPDATE,
	CYCLE_LOAD,
	CYCLE_SAVE,
	CYCLE_STATUS,
	CYCLE_EXECUTE,
	DATA_LOAD,
	EVENTS_LOAD,
	GROUPS_LOAD,
	GROUP_SAVE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	socketService,
	normalizeIds,
	denormalizeIds,
	isTempId,
	newTempId
} from '../../../../../services/socket';
import {cleanCycleModuleConfigs} from '../models/sequenceModule';

export const listenerEvents =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.on('UPDATE_CONFIGURATION', message => {
			dispatch({
				type: CYCLE_SAVE,
				payload: normalizeIds(JSON.parse(message).cycle)
			});
		});
	};

// Le box renvoie le status d'exécution directement sur les cycles/séquences de
// `front/box/fetch/configuration` (getConfigurationWithStatus). On le remet à
// plat dans la forme attendue par la tranche `root_cycle.status`.
export const statusFromConfiguration = (cycles: any[] = []) => {
	const entries: any[] = [];
	const push = (item: any, type: 'CYCLE' | 'SEQUENCE') => {
		if (!item?.id || !item.status) {
			return;
		}
		entries.push({
			id: item.id,
			type,
			status: item.status,
			// `progression` n'est renseigné par le box que pour un exécutable en
			// cours ; les consommateurs retombent sur leurs propres valeurs par
			// défaut sinon.
			startedAt: item.progression?.startedAt,
			duration: item.progression?.duration
		});
	};
	(cycles || []).forEach((cycle: any) => {
		push(cycle, 'CYCLE');
		(cycle.sequences || []).forEach((seq: any) => push(seq, 'SEQUENCE'));
	});
	return entries;
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
			denormalizeIds({type, query}),
			(response: any) => {
				//dispatch({ type: CYCLE_EXECUTE, payload: false });
				if (type !== 'DATA') {
					dispatch({
						type: CYCLE_STATUS,
						payload: normalizeIds(JSON.parse(response.config)),
						// Snapshot complet renvoyé par le box : il remplace la
						// tranche au lieu de s'y superposer.
						replace: true
					});
				} else {
					dispatch({
						type: DATA_LOAD,
						payload: normalizeIds(JSON.parse(response.config))
					});
				}
			}
		);
	};

export const loadEvents =
	(query: {
		deviceId: string;
		startDate: any;
		endDate: any;
	}): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/fetch/events',
			denormalizeIds(query),
			(response: any) => {
				const raw = response?.config;
				dispatch({
					type: EVENTS_LOAD,
					payload: normalizeIds(raw) || []
				});
			}
		);
	};

export const loadCycles =
	(): ThunkAction<void, RootState, unknown, AnyAction> => async dispatch => {
		socketService.emit(
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				const cycles = normalizeIds(JSON.parse(response.config).cycles);
				dispatch({
					type: CYCLES_LOAD,
					payload: cycles
				});
				dispatch({
					type: CYCLE_STATUS,
					payload: statusFromConfiguration(cycles),
					replace: true
				});
			}
		);
	};

export const loadCycle =
	(
		cycleId: string,
		// When creating a new cycle (no `cycleId`), preset its `parentCycleId` so
		// the box auto-associates it to the GROUP cycle as a `childCycle` on save.
		parentCycleId?: string,
		// Optional entity type for the new-cycle template (e.g. `MODULE`); a plain
		// cycle when omitted.
		newType?: string
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: CYCLE_LOAD,
			payload: cycleId,
			parentCycleId,
			newType
		});
	};

export const loadGroups =
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
					// `config.tasks` is the backend wire key (unchanged until the
					// box exposes `config.groups`); it feeds the `groups` slice.
					payload: config.cycles.filter((x: any) => x.type === 'GROUP')
				});
				dispatch({
					type: CYCLE_STATUS,
					payload: statusFromConfiguration(config.cycles),
					replace: true
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
				denormalizeIds(cleanCycleModuleConfigs(data)),
				async (response: any) => {
					await dispatch({
						type: CYCLE_SAVE,
						payload: normalizeIds(JSON.parse(response.config).cycle),
						tempId: isTempId(data.id) ? data.id : undefined
					});
					onSuccess?.();
				}
			);
		}
	};

// Builds a blank GROUP cycle for the "add new group" flow. Mirrors the new-cycle
// template but is typed `GROUP` and holds `childCycles` instead of `sequences`.
const newGroup = () => ({
	id: newTempId(),
	type: 'GROUP',
	name: 'new group',
	description: 'new group',
	parentCycleId: null,
	style: {
		bgColor: '#a5f3fc',
		fontColor: '#60a5fa',
		iconColor: {base: '#60a5fa', icon: '#60a5fa'}
	},
	modePriority: [
		{mode: 'MANUAL', priority: 0},
		{mode: 'SCHEDULE', priority: 1},
		{mode: 'TRIGGER', priority: 2},
		{mode: 'AUTO', priority: 3},
		{mode: 'SYSTEM', priority: 4}
	],
	childCycles: [],
	schedules: [],
	triggers: [],
	isModified: true
});

// Loads a group into the shared editing slice (state.root_cycle.cycle) so the
// existing cycle settings screens can edit it. With no `groupId`, a fresh GROUP
// is created (the "add new group" flow).
export const loadGroup =
	(groupId?: string): ThunkAction<void, RootState, unknown, AnyAction> =>
	(dispatch, getState) => {
		const group = groupId
			? ((getState() as any).root_cycle.groups as any[]).find(
					(x: any) => x.id === groupId
			  )
			: newGroup();
		dispatch({
			type: CYCLE_UPDATE,
			payload: group
		});
	};

export const saveGroup =
	(
		data: any,
		soft = false,
		// Receives the persisted group so callers can read the real id the box
		// assigned (needed to link freshly-created child cycles to a brand-new
		// group).
		onSuccess?: (savedGroup: any) => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		if (soft) {
			await dispatch({
				type: GROUP_SAVE,
				payload: data
			});
			onSuccess?.(data);
		} else {
			socketService.emit('front/box/sync/cycle',
				denormalizeIds(cleanCycleModuleConfigs(data)),
				async (response: any) => {
					const saved = normalizeIds(JSON.parse(response.config).cycle);
					await dispatch({
						type: GROUP_SAVE,
						payload: saved,
						tempId: isTempId(data.id) ? data.id : undefined
					});
					onSuccess?.(saved);
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
				denormalizeIds(data),
				(response: any) => {
					dispatch({type: CYCLE_EXECUTE, payload: false});
					resolve(response);
				}
			);
		});
	};
