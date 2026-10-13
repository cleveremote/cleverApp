import {newTempId, isTempId} from '../../../../../services/socket';

export const loadTriggers = (cycle: any) => {
	return cycle?.triggers || [];
};

export const loadTrigger = (
	triggers: any,
	triggerId: string,
	cycleId: string
) => {
	if (triggerId) {
		return triggers.find((x: any) => x.id === triggerId);
	} else if (cycleId) {
		return {
			id: newTempId(),
			cycleId: cycleId,
			name: 'new trigger',
			description: 'new trigger',
			action: 'ON',
			delay: 5000,
			trigger: {timeAfter: 5000},
			shouldConfirmation: true,
			isPaused: true,
			isModified: true,
			conditions: []
		};
	} else {
		return null;
	}
};

export const updateTrigger = (
	prevTriggers: any,
	trigger: any,
	tempId?: string
) => {
	// Suppression d'un trigger jamais persisté (id temporaire) : on le retire
	// simplement de la liste, sans le conserver marqué `delete` ni l'envoyer au
	// backend (qui ne le connaît pas).
	const isTempDelete = trigger?.delete && isTempId(trigger?.id);
	const removeId = tempId ?? (isTempDelete ? trigger.id : undefined);
	const previous: any[] = removeId
		? prevTriggers.filter((x: any) => x.id !== removeId)
		: [...prevTriggers];
	if (trigger && !isTempDelete) {
		const index = previous.findIndex(x => x.id === trigger?.id);
		if (index > -1) {
			previous[index] = trigger;
		} else {
			previous.push(trigger);
		}
	}
	return previous;
};
