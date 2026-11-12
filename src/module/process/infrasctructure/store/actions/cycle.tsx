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
	GROUP_SAVE,
	DEVICE_CONNECTIVITY_LOAD
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
import {toCycleRuns} from '../models/cycleHistory';
import {currentLanguage} from '../../../../../i18n/language';
import {Alert} from 'react-native';
import i18n from 'i18next';
import {authenticationService} from '../../../../authentication/domain/services/auth.service';
import {
	describeUnreachable,
	findExecutable,
	selectUnreachableDevices
} from '../models/deviceConnectivity';

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

// Global loader only while no status is loaded yet.
export const loadValues =
	(
		type: string,
		query?: any
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		//dispatch({ type: CYCLE_EXECUTE, payload: true });
		const state = getState() as any;
		socketService.emitRefresh(
			type === 'DATA'
				? !!state.root_cycle.data?.length
				: !!state.root_cycle.status?.length,
			'front/box/fetch/status',
			denormalizeIds({type, query}),
			(response: any) => {
				//dispatch({ type: CYCLE_EXECUTE, payload: false });
				if (type !== 'DATA') {
					const values = normalizeIds(JSON.parse(response.config));
					// Le box renvoie tout l'objet des valeurs ({processes,
					// sensors…}) et non la seule liste : l'appliquer tel quel
					// remplaçait la tranche par une entrée vide et coupait
					// visuellement les cycles en cours jusqu'au fetch de
					// configuration suivant.
					const statuses = Array.isArray(values)
						? values
						: values?.processes;
					if (!Array.isArray(statuses)) {
						return;
					}
					dispatch({
						type: CYCLE_STATUS,
						payload: statuses,
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
		// Sans deviceId : événements de tous les cycles confondus. Sans aucun
		// critère : la box renvoie les 50 derniers événements.
		deviceId?: string;
		startDate?: any;
		endDate?: any;
		limit?: number;
	}): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		socketService.emit(
			'front/box/fetch/events',
			{...denormalizeIds(query), lang: currentLanguage()},
			(response: any) => {
				dispatch({
					type: EVENTS_LOAD,
					payload: toCycleRuns(normalizeIds(response?.config))
				});
			}
		);
	};

// Re-run on every focus: global loader only while the list is still empty.
export const loadCycles =
	(): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		socketService.emitRefresh(
			!!(getState() as any).root_cycle.cycles?.length,
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				const config = normalizeIds(JSON.parse(response.config));
				const cycles = config.cycles;
				dispatch({
					type: CYCLES_LOAD,
					payload: cycles
				});
				dispatch({
					type: DEVICE_CONNECTIVITY_LOAD,
					payload: config.devices
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

// Re-run on every focus: global loader only while the list is still empty.
export const loadGroups =
	(): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		socketService.emitRefresh(
			!!(getState() as any).root_cycle.cycles?.length,
			'front/box/fetch/configuration',
			{},
			(response: any) => {
				const config = normalizeIds(JSON.parse(response.config));
				dispatch({
					type: CYCLES_LOAD,
					payload: config.cycles
				});
				dispatch({
					type: DEVICE_CONNECTIVITY_LOAD,
					payload: config.devices
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
	name: i18n.t('common:defaults.newGroup'),
	description: i18n.t('common:defaults.newGroup'),
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

// Démarrages refusés tant qu'un master/slave requis est injoignable. Les
// arrêts (OFF, SKIP, IGNORE) restent toujours possibles.
const isStart = (data: any) =>
	data?.action === 'ON' && !['SKIP', 'IGNORE'].includes(data?.type);

// Le box ne garde pas la durée surchargée quand il refuse le démarrage
// (conditions non vérifiées) ou le met en attente de confirmation : il la
// renvoie dans le status (requestedDuration), et « Forcer » / « Mettre en
// file » la réutilisent.
const withRequestedDuration = (data: any, status: any[]) => {
	if (
		!['FORCE', 'QUEUED', 'IGNORE'].includes(data?.type) ||
		data.action !== 'ON' ||
		data.duration
	) {
		return data;
	}
	const duration = (status || []).find((x: any) => x?.id === data.id)
		?.requestedDuration;
	return duration > 0 ? {...data, duration} : data;
};

export const executeCycle =
	(data: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	async (dispatch, getState) => {
		if (isStart(data)) {
			const state = getState() as any;
			const target = findExecutable(state.root_cycle.cycles, data.id);
			const unreachable = target
				? selectUnreachableDevices(state, target.item, target.kind)
				: [];
			if (unreachable.length) {
				Alert.alert(
					i18n.t('common:devicesUnreachable.title'),
					i18n.t('common:devicesUnreachable.message', {
						name: target!.item.name,
						devices: describeUnreachable(unreachable)
					})
				);
				return;
			}
		}
		data = withRequestedDuration(
			data,
			(getState() as any).root_cycle.status
		);
		dispatch({type: CYCLE_EXECUTE, payload: true});
		const requestedBy = await authenticationService.getCurrentUserName();
		return new Promise((resolve, reject) => {
			if (!socketService.connected) {
				reject(new Error(i18n.t('common:errors.noServer')));
			}

			socketService.emit(
				'front/box/execute/process',
				denormalizeIds({...data, requestedBy}),
				(response: any) => {
					dispatch({type: CYCLE_EXECUTE, payload: false});
					resolve(response);
				}
			);
		});
	};

// Masque localement la notification portée par le status d'un cycle (ex.
// CONDITIONS_NOT_VERIFIED) sans toucher au status lui-même.
export const dismissCycleNotification =
	(id: string): ThunkAction<void, RootState, unknown, AnyAction> =>
	(dispatch, getState) => {
		const entry = ((getState() as any).root_cycle.status || []).find(
			(x: any) => x?.id === id
		);
		if (!entry) {
			return;
		}
		const {notification, causes, ...rest} = entry;
		dispatch({type: CYCLE_STATUS, payload: rest});
	};
