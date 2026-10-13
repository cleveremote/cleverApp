import {newTempId, isTempId} from '../../../../../services/socket';

export const loadConditions = (parent: any) => {
	return (parent?.conditions || []).map((c: any) => ({
		...c,
		id: c.id ?? newTempId()
	}));
};

export const loadCondition = (
	conditions: any,
	conditionId: string,
	parentId: string,
	parentType: string
) => {
	if (conditionId) {
		return conditions.find((x: any) => x.id === conditionId);
	} else if (parentId) {
		return {
			id: newTempId(),
			parentId: parentId,
			parentType: parentType,
			name: 'new condition',
			description: 'new condition',
			elementId: '',
			elementType: 'CYCLE',
			// Défauts vides : `value` (et l'opérateur en sensor) doivent être
			// saisis. En mode CYCLE l'opérateur est forcé à `=`, la value à
			// ON/OFF ; en SENSOR la value est un flottant. On ne pré-remplit
			// donc pas `value` sous peine de contourner la règle `required`.
			operator: '=',
			value: '',
			isModified: true
		};
	} else {
		return null;
	}
};

export const updateCondition = (
	prevConditions: any,
	condition: any,
	tempId?: string
) => {
	// Suppression d'une condition jamais persistée (id temporaire) : on la retire
	// simplement de la liste, sans la conserver marquée `delete` ni l'envoyer au
	// backend (qui ne la connaît pas).
	const isTempDelete = condition?.delete && isTempId(condition?.id);
	const removeId = tempId ?? (isTempDelete ? condition.id : undefined);
	const previous: any[] = removeId
		? prevConditions.filter((x: any) => x.id !== removeId)
		: [...prevConditions];
	if (condition && !isTempDelete) {
		const index = previous.findIndex(x => x.id === condition?.id);
		if (index > -1) {
			previous[index] = condition;
		} else {
			previous.push(condition);
		}
	}

	return previous;
};
