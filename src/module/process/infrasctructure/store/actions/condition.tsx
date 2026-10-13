import {
	CONDITION_UPDATE,
	CONDITIONS_LOAD,
	CONDITION_LOAD,
	CONDITION_SAVE,
	CONDITIONS_SAVE
} from './types';

import {ThunkAction} from 'redux-thunk';
import {AnyAction} from 'redux';
import {RootState} from '../store';
import {
	assignConditionOrder,
	ConditionParentType
} from '../../../../../app/data/conditionTypes';

export const updateCondition =
	(condition: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: CONDITION_UPDATE,
			payload: condition
		});
	};

export const loadConditions =
	(conditionId: any): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: CONDITIONS_LOAD,
			payload: conditionId
		});
	};

export const loadCondition =
	(
		conditionId: string,
		parentId: string,
		parentType: ConditionParentType
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	dispatch => {
		dispatch({
			type: CONDITION_LOAD,
			payload: {conditionId, parentId, parentType}
		});
	};

export const saveCondition =
	(
		data: any,
		_soft?: boolean,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		dispatch({
			type: CONDITION_SAVE,
			payload: data
		});
		onSuccess?.();
	};

export const saveConditions =
	(
		conditions: any,
		onSuccess?: () => void
	): ThunkAction<void, RootState, unknown, AnyAction> =>
	async dispatch => {
		await dispatch({
			type: CONDITIONS_SAVE,
			payload: assignConditionOrder(conditions)
		});
		onSuccess?.();
	};
