import {newTempId} from '../../../../../services/socket';

export const loadActuators = (actuators: any) => {
	return actuators || [];
};

export const loadActuator = (
	actuators: any,
	actuatorId?: string,
	defaults?: Record<string, any>
) => {
	if (actuatorId) {
		return (actuators || []).find((x: any) => x.id === actuatorId);
	}
	// Création : entité temporaire, l'écran injecte le discriminant `type` et la
	// config vide correspondante.
	return {
		id: newTempId(),
		isModified: true,
		...defaults
	};
};

export const updateActuator = (
	prevActuators: any,
	actuator: any,
	tempId?: string
) => {
	const previous: any[] = tempId
		? (prevActuators || []).filter((x: any) => x.id !== tempId)
		: [...(prevActuators || [])];
	if (actuator) {
		const index = previous.findIndex(x => x.id === actuator?.id);
		if (index > -1) {
			previous[index] = actuator;
		} else {
			previous.push(actuator);
		}
	}
	return previous;
};
