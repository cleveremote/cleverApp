// Régulation d'une vanne CTRL, portée par la box dans une entité à part
// (`ControlLoopModel`, collection `control_loops`) : la vanne ne garde que ses
// paramètres physiques, la boucle relie la vanne (`actuatorId`) à un capteur de
// retour (`sensorId`) et vise une consigne (`setpoint`, unité du capteur).
// Quand une séquence envoie une action ≠ 0 à une vanne dont la boucle est
// activée, la box régule jusqu'à la consigne ; sinon l'action est l'ouverture %.
// En mode FOLLOW, la boucle n'a pas de consigne : pendant le ON, la box recopie
// l'entrée analogique (potentiomètre, `follow.inputMin..inputMax`) en ouverture %.

import {newTempId} from '../../services/socket';
import i18n from 'i18next';

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

export enum ControlLoopMode {
	REGULATION = 'REGULATION',
	FOLLOW = 'FOLLOW'
}

// Libellés en getters : lus dans la langue courante à chaque rendu.
export const modeOptions = [
	{
		get label() {
			return i18n.t('actuators:controlLoop.mode.REGULATION');
		},
		value: ControlLoopMode.REGULATION
	},
	{
		get label() {
			return i18n.t('actuators:controlLoop.mode.FOLLOW');
		},
		value: ControlLoopMode.FOLLOW
	}
];

export interface ControlLoopParams {
	kP?: number;
	kI?: number;
	kD?: number;
	tolerance?: number;
	maxIterations?: number;
	iterationDelayMs?: number;
}

export interface ControlLoopFollow {
	inputMin: number;
	inputMax: number;
	deadband: number;
}

// Boucle telle que renvoyée par getStructure (`structure.controlLoops`) et par
// `box/synchronize/control-loop`.
export interface ControlLoop {
	id: any;
	name?: string;
	actuatorId: any;
	sensorId?: any;
	isEnabled: boolean;
	mode: ControlLoopMode | `${ControlLoopMode}`;
	setpoint?: number;
	algorithm?: ControlAlgorithm;
	params?: ControlLoopParams;
	follow?: ControlLoopFollow;
	delete?: boolean;
	isModified?: boolean;
}

// Les boucles antérieures au mode FOLLOW n'ont pas de `mode` : régulation.
export const isFollowLoop = (loop?: Partial<ControlLoop>) =>
	loop?.mode === ControlLoopMode.FOLLOW;

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

// Valeurs par défaut du suivi potentiomètre (deadband en %).
export const emptyFollowParams = (): ControlLoopFollow => ({
	inputMin: 0,
	inputMax: 100,
	deadband: 1
});

// Boucle créée à la première activation de la régulation d'une vanne.
export const emptyControlLoop = (actuator: any): ControlLoop => ({
	id: newTempId(),
	name: actuator?.name,
	actuatorId: actuator?.id,
	sensorId: undefined,
	isEnabled: true,
	mode: ControlLoopMode.REGULATION,
	setpoint: undefined,
	algorithm: ControlAlgorithm.P,
	params: emptyControlParams()
});

// La boucle d'une vanne (une seule par vanne côté app), activée ou non.
export const loopOf = (
	loops: any[] = [],
	actuatorId: any
): ControlLoop | undefined =>
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
	sensor?.config?.scaling?.unit ?? sensor?.config?.unit ?? sensor?.unit;
