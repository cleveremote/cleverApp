// Régulation d'une vanne CTRL, portée par la box dans une entité à part
// (`ControlLoopModel`, collection `control_loops`) : la vanne ne garde que ses
// paramètres physiques, la boucle relie la vanne (`actuatorId`) à un capteur de
// retour (`sensorId`) et vise une consigne (`setpoint`, unité du capteur).
// Quand une séquence envoie une action ≠ 0 à une vanne dont la boucle est
// activée, la box régule jusqu'à la consigne ; sinon l'action est l'ouverture %.

import {newTempId} from '../../services/socket';

// Événements socket (relayés vers `box/synchronize/valve` et
// `box/synchronize/control-loop`) et clé de la configuration box.
export const SYNC_VALVE_EVENT = 'front/box/sync/valve';
export const SYNC_CONTROL_LOOP_EVENT = 'front/box/sync/control-loop';
export const CONTROL_LOOPS_CONFIG_KEY = 'controlLoops';

export enum ControlAlgorithm {
	P = 'P',
	PI = 'PI',
	PID = 'PID'
}

export const algorithmOptions = Object.values(ControlAlgorithm).map(value => ({
	label: value,
	value
}));

// Valeurs par défaut de `PidParamsModel`.
export const emptyControlParams = () => ({
	kP: 5,
	kI: 0,
	kD: 0,
	tolerance: 1,
	maxIterations: 20,
	iterationDelayMs: 500
});

// Boucle créée à la première activation de la régulation d'une vanne.
export const emptyControlLoop = (actuator: any) => ({
	id: newTempId(),
	name: actuator?.name,
	actuatorId: actuator?.id,
	sensorId: undefined,
	isEnabled: true,
	setpoint: undefined,
	algorithm: ControlAlgorithm.P,
	params: emptyControlParams()
});

// La boucle d'une vanne (une seule par vanne côté app), activée ou non.
export const loopOf = (loops: any[] = [], actuatorId: any) =>
	(loops ?? []).find(
		(l: any) => !l.delete && `${l.actuatorId}` === `${actuatorId}`
	);

// La boucle activée d'une vanne : c'est elle qui fait réguler la box.
export const enabledLoopOf = (loops: any[] = [], actuatorId: any) => {
	const loop = loopOf(loops, actuatorId);
	return loop?.isEnabled ? loop : undefined;
};

// Unité du capteur de retour, affichée à côté de la consigne et de la tolérance.
export const sensorUnit = (sensor: any): string | undefined =>
	sensor?.config?.unit ?? sensor?.unit;
