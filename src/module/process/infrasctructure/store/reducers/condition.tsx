import {
	CONDITIONS_LOAD,
	CONDITION_LOAD,
	CONDITION_UPDATE,
	CONDITION_SAVE,
	CONDITIONS_SAVE
} from '../actions/types';
import {
	loadCondition,
	loadConditions,
	updateCondition
} from './condition-reducer-helper';

const initialState = {
	conditions: [],
	condition: undefined,
	// Id du parent (cycle/séquence/trigger) auquel appartient le tableau
	// `conditions` actuellement chargé. Le slice étant partagé entre les listes
	// de conditions embarquées, cet id permet à chaque liste de savoir si le
	// slice lui correspond (recharger / synchroniser) ou non (ignorer).
	conditionsParentId: undefined as string | undefined,
	// Jeton incrémenté à chaque (re)chargement autoritaire de la liste
	// (CONDITIONS_LOAD). Les listes embarquées s'en servent pour ré-établir leur
	// baseline « propre » après un rechargement externe (ex. purge post-save
	// auto), sans quoi elles verraient la nouvelle liste comme une modification.
	conditionsToken: 0
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case CONDITIONS_LOAD: {
			return {
				...state,
				conditions: loadConditions(action.payload),
				conditionsParentId: action.payload?.id,
				conditionsToken: state.conditionsToken + 1
			};
		}

		case CONDITION_LOAD: {
			return {
				...state,
				condition: loadCondition(
					state.conditions,
					action.payload.conditionId,
					action.payload.parentId,
					action.payload.parentType
				)
			};
		}

		case CONDITION_UPDATE: {
			return {
				...state,
				condition: action.payload
			};
		}

		case CONDITION_SAVE: {
			return {
				...state,
				conditions: updateCondition(
					state.conditions,
					action.payload,
					action.tempId
				)
			};
		}

		case CONDITIONS_SAVE: {
			return {
				...state,
				conditions: action.payload
			};
		}

		default:
			return state;
	}
};
