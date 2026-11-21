/**
 * Affichage global des erreurs renvoyées par le box.
 *
 * Le serveur répond `{ res: false, error: error.message }` lorsqu'un appel
 * échoue : `SocketService` enveloppe chaque callback d'ack pour afficher ce
 * message dans une popup, avant de laisser le callback traiter la réponse.
 */

import {Alert} from 'react-native';
import i18n from 'i18next';

// Événements dont l'écran affiche déjà sa propre erreur (connexion, formulaire
// de test de commande…) : pas de popup en double.
const SELF_HANDLED_EVENTS = new Set([
	'front/box/refreshtoken',
	'front/box/login',
	'front/box/execute/device-command'
]);

const parse = (response: unknown): any => {
	if (typeof response !== 'string') return response;
	try {
		return JSON.parse(response);
	} catch {
		return response;
	}
};

export const isErrorResponse = (response: unknown): boolean =>
	parse(response)?.res === false;

export const showResponseError = (response: unknown): void => {
	const error = parse(response)?.error;
	const message =
		typeof error === 'string' && error
			? error
			: error?.message || i18n.t('common:errors.unexpected');
	Alert.alert(i18n.t('common:error'), message);
};

export const withErrorAlert = <T extends (...args: any[]) => any>(
	event: string,
	ack: T
): T => {
	if (SELF_HANDLED_EVENTS.has(event)) {
		return ack;
	}
	return ((...args: any[]) => {
		if (isErrorResponse(args[0])) {
			showResponseError(args[0]);
		}
		return ack(...args);
	}) as T;
};
