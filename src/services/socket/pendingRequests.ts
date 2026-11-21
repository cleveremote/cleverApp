/**
 * Compteur des requêtes socket en attente d'un ack du box.
 *
 * Chaque `emit` porteur d'un callback est une requête dont l'UI attend la
 * réponse : `SocketService` l'enregistre ici, et `GlobalLoader` affiche un
 * loader tant que le compteur est > 0.
 */

type Listener = () => void;

// Au-delà, l'ack est considéré comme perdu (socket coupé, box muet) : la
// requête est libérée pour que le loader ne bloque pas l'app indéfiniment.
const REQUEST_TIMEOUT_MS = 20000;

// Requêtes de fond, ou dont l'écran affiche déjà son propre loader.
const SILENT_EVENTS = new Set([
	'front/box/refreshtoken',
	'front/box/login',
	// L'onglet Événements affiche son loader sur la liste.
	'front/box/fetch/events'
]);

let pending = 0;
const listeners = new Set<Listener>();
// `release` de chaque requête en vol, pour pouvoir toutes les libérer d'un coup.
const inFlight = new Set<() => void>();

const notify = () => listeners.forEach(listener => listener());

export const pendingRequests = {
	get count(): number {
		return pending;
	},

	subscribe(listener: Listener): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},

	/**
	 * Libère toutes les requêtes en vol : à la coupure du socket, leurs acks ne
	 * reviendront jamais (socket.io les abandonne), et le loader resterait
	 * affiché jusqu'au timeout. Un ack qui arriverait quand même plus tard
	 * s'exécute normalement, sans redécompter.
	 */
	releaseAll(): void {
		[...inFlight].forEach(release => release());
	},

	/**
	 * Enveloppe un callback d'ack : la requête compte comme en attente jusqu'à
	 * ce qu'il ait fini de s'exécuter. Libérer après le callback (et non avant)
	 * garde le compteur > 0 quand il enchaîne une autre requête (ex. un save
	 * suivi d'un `loadConfiguration`), ce qui évite un clignotement du loader.
	 */
	track<T extends (...args: any[]) => any>(event: string, ack: T): T {
		if (SILENT_EVENTS.has(event)) {
			return ack;
		}

		let done = false;
		const release = () => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			inFlight.delete(release);
			pending = Math.max(0, pending - 1);
			notify();
		};
		const timer = setTimeout(release, REQUEST_TIMEOUT_MS);

		inFlight.add(release);
		pending += 1;
		notify();

		return ((...args: any[]) => {
			let result: any;
			try {
				result = ack(...args);
			} catch (e) {
				release();
				throw e;
			}
			// Callback `async` : attendre qu'il ait fini ses dispatchs.
			if (result && typeof result.then === 'function') {
				result.then(release, release);
			} else {
				release();
			}
			return result;
		}) as T;
	}
};
