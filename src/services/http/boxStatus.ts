import {PollOptions, boxGet, boxUrl, pollUntil} from './boxHttp';

/** Route de la box interrogée ici ; elle répond sans authentification. */
const STATUS_PATH = '/updater/getStatus';

/** Budget d'une sonde. Court : elle sera relancée. */
const PROBE_TIMEOUT_MS = 5000;

/**
 * État Wi-Fi de la box, tel qu'elle le rapporte.
 *
 * `ssid` est le réseau auquel elle est réellement associée, et c'est sur lui
 * que porte la comparaison. `connectionName` est un nom de profil
 * NetworkManager : il vaut souvent le SSID, mais un doublon devient
 * « MonWifi 1 » et un profil préexistant peut porter tout autre nom — s'y fier
 * ferait échouer la vérification sur une box pourtant bien connectée. Il n'est
 * gardé que pour l'affichage et les journaux.
 */
export interface WifiStatus {
	interface: string;
	mode: 'ap' | 'client' | 'disconnected';
	connectionName: string | null;
	ssid: string | null;
	deviceState: string;
}

/**
 * États NetworkManager qui disent une tentative perdue plutôt qu'en cours.
 *
 * `need-auth` est celui qui compte : c'est la clé Wi-Fi refusée, la seule
 * erreur que l'utilisateur puisse corriger lui-même.
 */
const FAILED_DEVICE_STATES = new Set(['need-auth', 'failed']);

/**
 * États où la connexion est réellement établie, et pas seulement demandée.
 *
 * C'est le garde-fou contre un `mode: 'client'` qui décrirait le profil
 * configuré plutôt que l'association obtenue : sans lui, une box qui n'a pas
 * réussi à joindre le réseau serait annoncée configurée. `activated` est le
 * terme NetworkManager, `connected` celui que rapporte `nmcli dev`.
 */
const CONNECTED_DEVICE_STATES = new Set(['activated', 'connected']);

/**
 * Lit l'état Wi-Fi de la box, ou `null` si la réponse n'en est pas un.
 *
 * Un corps inattendu n'est pas remonté comme une erreur : pendant une bascule
 * réseau, la sonde peut tomber sur autre chose que la box (portail captif,
 * passerelle du réseau courant). C'est un essai de plus, pas un incident.
 */
export async function getWifiStatus(
	timeoutMs = PROBE_TIMEOUT_MS
): Promise<WifiStatus | null> {
	const url = await boxUrl(STATUS_PATH);
	const {status, body} = await boxGet(url, timeoutMs);

	// Une box qui répond une erreur, ou autre chose qu'un état, disparaîtrait
	// autrement dans le même `null` qu'une box injoignable — et l'écran finirait
	// par annoncer « introuvable » une box qui parlait très bien.
	if (status < 200 || status >= 300) {
		console.warn(`[boxStatus] HTTP ${status} — ${body.slice(0, 200)}`);
		return null;
	}

	const parsed = parseWifiStatus(body);
	if (!parsed) {
		console.warn(`[boxStatus] réponse illisible — ${body.slice(0, 200)}`);
	}
	return parsed;
}

/**
 * La box est-elle associée au réseau demandé, et la connexion est-elle établie ?
 *
 * Les trois conditions comptent. `mode` et `ssid` peuvent décrire ce vers quoi
 * la box a été configurée plutôt que ce qu'elle a obtenu — c'est `deviceState`
 * qui distingue une connexion aboutie d'une tentative en cours ou perdue. S'en
 * passer, c'est annoncer « box configurée » sur une box qui ne l'est pas.
 */
export function hasJoined(
	status: WifiStatus | null,
	ssid: string
): status is WifiStatus {
	if (status?.mode !== 'client') return false;
	if (!CONNECTED_DEVICE_STATES.has(normalise(status.deviceState))) return false;

	const joined = normalise(status.ssid);
	// Un SSID vide des deux côtés ne prouve rien : c'est une box qui ne dit pas
	// à quoi elle est associée, pas une correspondance.
	return joined !== '' && joined === normalise(ssid);
}

/** La tentative est-elle perdue — typiquement une clé Wi-Fi refusée ? */
export function isAuthFailure(status: WifiStatus | null): boolean {
	if (!status) return false;
	return FAILED_DEVICE_STATES.has(normalise(status.deviceState));
}

export type WaitForWifiStatusOptions = PollOptions & {
	/** SSID que la box doit avoir rejoint. */
	ssid: string;
	/** Budget d'une sonde. */
	requestTimeoutMs?: number;
};

/**
 * Attend que la box déclare avoir rejoint `ssid`.
 *
 * Rend le dernier état observé plutôt qu'un booléen : l'écran appelant a besoin
 * de la raison — jamais jointe, jointe mais sur un autre réseau, clé refusée —
 * et pas seulement du verdict. `null` signifie qu'on ne l'a jamais atteinte
 * dans le budget imparti.
 *
 * Ce que la box répond ne peut venir que d'elle : la poignée de main TLS est
 * vérifiée contre la CA privée, sur un nom `.local` que le certificat doit
 * porter. C'est ce qui rend la sonde fiable alors même que la résolution mDNS
 * peut retomber sur la passerelle du réseau courant.
 */
export async function waitForWifiStatus(
	options: WaitForWifiStatusOptions
): Promise<WifiStatus | null> {
	const {ssid, requestTimeoutMs = PROBE_TIMEOUT_MS} = options;

	// Le dernier état atteint survit à l'expiration du budget : c'est lui qui
	// distingue « jamais jointe » de « jointe, mais pas sur le bon réseau ».
	let seen: WifiStatus | null = null;

	const joined = await pollUntil(async () => {
		const status = await getWifiStatus(requestTimeoutMs);
		if (status) seen = status;

		const verdict = hasJoined(status, ssid);
		if (status) {
			// Les trois champs qui décident, et le SSID attendu en face : c'est
			// tout ce qu'il faut pour savoir pourquoi la box a été acceptée ou
			// non, sans avoir à rejouer la scène.
			console.log(
				`[boxStatus] attendu="${ssid}" — mode=${status.mode} ssid="${
					status.ssid ?? ''
				}" deviceState=${status.deviceState} → ${
					verdict ? 'confirmée' : 'pas encore'
				}`
			);
		}

		return verdict || isAuthFailure(status) ? status : undefined;
	}, options);

	return joined ?? seen;
}

/**
 * Ni la casse ni les espaces de bord ne distinguent deux réseaux ; s'y arrêter
 * ferait échouer la vérification sur une box correctement connectée.
 */
function normalise(value: string | null | undefined): string {
	return (value ?? '').trim().toLowerCase();
}

function parseWifiStatus(body: string): WifiStatus | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return null;
	}

	if (!parsed || typeof parsed !== 'object') return null;
	const raw = parsed as Record<string, unknown>;

	// `mode` et `deviceState` portent le verdict : sans eux la réponse ne dit
	// rien d'exploitable, et mieux vaut la traiter comme du bruit.
	if (typeof raw.mode !== 'string' || typeof raw.deviceState !== 'string') {
		return null;
	}

	return {
		interface: typeof raw.interface === 'string' ? raw.interface : '',
		mode: raw.mode as WifiStatus['mode'],
		connectionName:
			typeof raw.connectionName === 'string' ? raw.connectionName : null,
		ssid: typeof raw.ssid === 'string' ? raw.ssid : null,
		deviceState: raw.deviceState
	};
}
