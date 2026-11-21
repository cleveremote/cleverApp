import type {BoxModeName} from './boxMode';

/**
 * Lecture du résultat de `configure`, tel que la box le publie dans `getMode`.
 *
 * La box répond à `POST /updater/configure` avant de quitter son point
 * d'accès : la réponse dit seulement « accepté ». Ce qui s'est passé ensuite —
 * Wi-Fi rejoint ou non, compte créé ou non — se lit ici. Rien dans ce fichier
 * ne touche au réseau, pour que ces décisions restent testables seules.
 */

/**
 * Codes que la box peut renvoyer autour de `configure` : en refus du POST
 * (`VALIDATION_FAILED`, `SETUP_FIELDS_REQUIRED`, `INVALID_CURRENT_PASSWORD`,
 * `CONFIGURE_IN_PROGRESS`) ou dans `configure.errorCode`. Chacun a sa
 * traduction sous `configureError.<CODE>`.
 */
export const CONFIGURE_ERROR_CODES = [
	'VALIDATION_FAILED',
	'SETUP_FIELDS_REQUIRED',
	'INVALID_CURRENT_PASSWORD',
	'CONFIGURE_IN_PROGRESS',
	'WIFI_INVALID_PSK',
	'WIFI_NETWORK_NOT_FOUND',
	'WIFI_TIMEOUT',
	'WIFI_INTERFACE_BUSY',
	'WIFI_CONNECT_FAILED',
	'WIFI_OPERATION_FAILED',
	'LOCAL_COORDINATES_SAVE_FAILED',
	'USER_SAVE_FAILED',
	'HOTSPOT_STOP_FAILED',
	'CONFIGURE_FAILED'
] as const;

export type ConfigureErrorCode = (typeof CONFIGURE_ERROR_CODES)[number];

const KNOWN_CODE = new RegExp(`\\b(${CONFIGURE_ERROR_CODES.join('|')})\\b`);

/**
 * Code d'erreur porté par le corps d'une réponse, ou `null` s'il n'y en a
 * aucun de connu. Cherché dans le texte plutôt que dans un champ précis : le
 * code compte, pas la forme du JSON qui l'enveloppe.
 */
export function extractErrorCode(body: string): ConfigureErrorCode | null {
	const match = KNOWN_CODE.exec(body);
	return match ? (match[1] as ConfigureErrorCode) : null;
}

export type ConfigureStatus = 'idle' | 'in-progress' | 'succeeded' | 'failed';

export interface ConfigureResult {
	status: ConfigureStatus;
	/** Renseigné seulement quand `status` vaut `failed`. */
	errorCode: ConfigureErrorCode | null;
	ssid: string | null;
	startedAt: string | null;
	finishedAt: string | null;
}

const STATUSES = new Set<ConfigureStatus>([
	'idle',
	'in-progress',
	'succeeded',
	'failed'
]);

/**
 * Champ `configure` de `getMode`, ou `null` s'il est absent ou illisible —
 * une box d'avant ce champ n'en publie pas, et se lit alors comme `idle`.
 */
export function parseConfigureResult(raw: unknown): ConfigureResult | null {
	if (!raw || typeof raw !== 'object') return null;
	const value = raw as Record<string, unknown>;
	if (!STATUSES.has(value.status as ConfigureStatus)) return null;
	const status = value.status as ConfigureStatus;

	const text = (field: unknown) =>
		typeof field === 'string' && field !== '' ? field : null;

	return {
		status,
		// Un échec sans code, ou avec un code que cette version ne connaît pas,
		// reste un échec : il prend le code générique.
		errorCode:
			status === 'failed'
				? extractErrorCode(String(value.errorCode ?? '')) ?? 'CONFIGURE_FAILED'
				: null,
		ssid: text(value.ssid),
		startedAt: text(value.startedAt),
		finishedAt: text(value.finishedAt)
	};
}

/**
 * Où joindre la box après un échec :
 * - `hotspot` : le Wi-Fi n'a pas abouti, elle a rouvert son point d'accès et
 *   rien n'a été enregistré ;
 * - `lan` : elle est sur le Wi-Fi demandé, point d'accès fermé ;
 * - `unknown` : erreur inattendue, l'un ou l'autre.
 */
export type BoxLocation = 'hotspot' | 'lan' | 'unknown';

export function boxLocationAfter(code: ConfigureErrorCode): BoxLocation {
	if (code.startsWith('WIFI_')) return 'hotspot';
	if (
		code === 'LOCAL_COORDINATES_SAVE_FAILED' ||
		code === 'USER_SAVE_FAILED' ||
		code === 'HOTSPOT_STOP_FAILED'
	) {
		return 'lan';
	}
	return 'unknown';
}

/**
 * Ce que dit une lecture de `getMode` sur la configuration envoyée :
 * - `pending` : bascule en cours, continuer d'interroger ;
 * - `succeeded` : la box est sur le Wi-Fi demandé ;
 * - `failed` : échec, détaillé par `code` ;
 * - `notApplied` : la box répond, en `setup` ou `recovery`, sans résultat —
 *   elle n'a jamais reçu la requête, ou a redémarré depuis.
 */
export type ConfigureOutcome =
	| {kind: 'pending'}
	| {kind: 'succeeded'}
	| {kind: 'failed'; code: ConfigureErrorCode}
	| {kind: 'notApplied'};

/**
 * @param staleStartedAt `configure.startedAt` lu avant l'envoi. Un résultat qui
 * le porte encore est celui d'une tentative précédente : si la requête s'est
 * perdue, il ferait annoncer le succès — ou l'échec — d'une autre.
 */
export function configureOutcome(
	mode: {mode: BoxModeName; configure: ConfigureResult | null},
	staleStartedAt?: string | null
): ConfigureOutcome {
	const result = mode.configure;
	const stale =
		Boolean(result?.startedAt) && result?.startedAt === staleStartedAt;
	const status = !result || stale ? 'idle' : result.status;

	switch (status) {
		case 'in-progress':
			return {kind: 'pending'};
		case 'succeeded':
			return {kind: 'succeeded'};
		case 'failed':
			return {kind: 'failed', code: result?.errorCode ?? 'CONFIGURE_FAILED'};
		default:
			// Sans résultat, c'est le mode qui parle.
			if (mode.mode === 'normal') return {kind: 'succeeded'};
			if (mode.mode === 'starting' || mode.mode === 'connecting') {
				return {kind: 'pending'};
			}
			return {kind: 'notApplied'};
	}
}

/**
 * Ce que la box a répondu à `POST /updater/configure` :
 * - `accepted` : elle applique la configuration, `getMode` dira la suite ;
 * - `refused` : elle n'a rien commencé, et dit pourquoi ;
 * - `lost` : pas de réponse exploitable — elle a pu recevoir la requête ou
 *   non, et seul `getMode` peut trancher.
 */
export type ConfigureSend =
	| {kind: 'accepted'}
	| {kind: 'refused'; code: ConfigureErrorCode}
	| {kind: 'lost'};

export function configureSendResult(status: number, body: string): ConfigureSend {
	if (status >= 200 && status < 300 && isConfirmation(body)) {
		return {kind: 'accepted'};
	}
	const code = extractErrorCode(body);
	// Une configuration est déjà en cours : le plus souvent la nôtre, arrivée
	// sans que sa réponse revienne. `getMode` en donnera l'issue.
	if (code === 'CONFIGURE_IN_PROGRESS') return {kind: 'accepted'};
	if (code) return {kind: 'refused', code};
	if (status === 401 || status === 403) {
		return {kind: 'refused', code: 'INVALID_CURRENT_PASSWORD'};
	}
	// Une erreur serveur sans code ne dit pas si la box a commencé.
	if (status >= 500) return {kind: 'lost'};
	return {kind: 'refused', code: 'CONFIGURE_FAILED'};
}

/**
 * La box accorde-t-elle la configuration, ou répond-elle « non » avec un 2xx ?
 *
 * Seul un refus explicite est retenu comme tel — `false`, un objet portant une
 * `error`, ou un objet dont le verdict est faux. Le reste d'un 2xx compte pour
 * un accord : les firmwares ne s'accordent pas sur le corps renvoyé, et exiger
 * une forme précise ferait échouer le parcours sur une box bien configurée.
 */
function isConfirmation(body: string): boolean {
	const trimmed = body.trim();
	if (trimmed === '') return true;

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return trimmed.toLowerCase() !== 'false';
	}

	if (typeof parsed === 'boolean') return parsed;
	if (parsed && typeof parsed === 'object') {
		const verdict = parsed as Record<string, unknown>;
		// Une erreur annoncée vaut refus, même sous un 200.
		if (verdict.error) return false;
		for (const key of ['success', 'ok', 'result']) {
			if (key in verdict) return Boolean(verdict[key]);
		}
	}
	return true;
}
