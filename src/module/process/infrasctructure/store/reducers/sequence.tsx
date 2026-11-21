import {
	SEQUENCE_SAVE,
	SEQUENCE_UPDATE,
	SEQUENCE_LOAD,
	SEQUENCES_LOAD,
	SEQUENCES_SAVE
} from '../actions/types';
import {
	loadSequence,
	loadSequences,
	updateSequence
} from './sequence-reducer-helper';

const initialState = {
	sequences: [],
	sequence: undefined,
	// Id du cycle auquel appartient le tableau `sequences` actuellement chargé.
	// Le slice est partagé : cet id permet à la liste embarquée de savoir si le
	// slice lui correspond (synchroniser) ou non (ignorer), et d'éviter de
	// synchroniser des séquences périmées au montage.
	sequencesParentId: undefined as string | undefined,
	// Jeton incrémenté à chaque (re)chargement autoritaire de la liste
	// (SEQUENCES_LOAD). La liste embarquée s'en sert pour ré-établir sa baseline
	// « propre » après un rechargement externe (ex. purge post-save auto), sans
	// quoi elle verrait la nouvelle liste comme une modification.
	sequencesToken: 0
};

export default (state = initialState, action: any) => {
	switch (action.type) {
		case SEQUENCES_LOAD: {
			return {
				...state,
				sequences: loadSequences(action.payload),
				sequencesParentId: action.payload?.id,
				sequencesToken: state.sequencesToken + 1
			};
		}

		case SEQUENCE_LOAD: {
			return {
				...state,
				sequence: loadSequence(state.sequences, action.payload)
			};
		}

		case SEQUENCE_UPDATE: {
			return {
				...state,
				sequence: action.payload
			};
		}

		case SEQUENCE_SAVE: {
			return {
				...state,
				sequences: updateSequence(state.sequences, action.payload)
			};
		}

		case SEQUENCES_SAVE: {
			return {
				...state,
				sequences: action.payload
			};
		}

		default:
			return state;
	}
};
