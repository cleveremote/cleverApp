
import {
    SEQUENCE_SAVE,
    SEQUENCE_UPDATE,
    SEQUENCE_LOAD,
    SEQUENCES_LOAD,
    SEQUENCE_ORDER
} from '../actions/types';
import { loadSequence, loadSequences, updateSequence } from './sequence-reducer-helper'

const initialState = {
    sequences: [],
    sequence: undefined,

};


export default (state = initialState, action: any) => {
    switch (action.type) {

        case SEQUENCES_LOAD: {
            return {
                ...state,
                sequences: loadSequences(action.payload)
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

        case SEQUENCE_ORDER: {
            return {
                ...state,
                sequences: action.payload
            };
        }



        default:
            return state;
    }
};
