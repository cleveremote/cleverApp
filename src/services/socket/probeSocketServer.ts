import {io} from 'socket.io-client';
import {initSSL} from './SSLConfig';

/** Budget d'une tentative de connexion. Court : elle sera relancée. */
const PROBE_TIMEOUT_MS = 5000;

/**
 * Le serveur websocket à `url` accepte-t-il les connexions ?
 *
 * Ouvre une connexion à part de celle de l'application, et la referme aussitôt :
 * rien n'est échangé, seul compte le fait qu'il réponde. Un refus du serveur —
 * la sonde se présente sans jeton — vaut donc réponse, au même titre qu'une
 * connexion acceptée ; seul un échec du transport (nom non résolu, port fermé,
 * TLS refusé, délai dépassé) dit qu'il n'est pas joignable. Ne rejette jamais.
 */
export async function probeSocketServer(
	url: string,
	extraHeaders?: Record<string, string>,
	timeoutMs = PROBE_TIMEOUT_MS
): Promise<boolean> {
	try {
		await initSSL();
	} catch (e) {
		console.warn('[probeSocketServer] initSSL:', e);
		return false;
	}

	return new Promise(resolve => {
		const socket = io(url, {
			// Jamais le socket de l'application : le fermer couperait sa session.
			forceNew: true,
			transports: ['websocket'],
			rejectUnauthorized: true,
			// Une seule tentative : c'est l'appelant qui décide de recommencer.
			reconnection: false,
			timeout: timeoutMs,
			...(extraHeaders ? {extraHeaders} : {})
		});

		let settled = false;
		const done = (reachable: boolean) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			socket.removeAllListeners();
			socket.disconnect();
			resolve(reachable);
		};
		// Filet : le délai du transport ne couvre pas un serveur qui ouvre la
		// connexion sans jamais achever la poignée de main socket.io.
		const timer = setTimeout(() => done(false), timeoutMs + 1000);

		socket.on('connect', () => done(true));
		socket.on('connect_error', error => {
			// `active` faux : le socket a été fermé par un refus du serveur, et
			// non par le transport — il a donc répondu.
			const refused = !socket.active;
			if (!refused) {
				console.warn(`[probeSocketServer] ${url}:`, error?.message ?? error);
			}
			done(refused);
		});
	});
}
