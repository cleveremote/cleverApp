import {PollOptions, boxGet, boxPost, boxUrl, pollUntil} from './boxHttp';

/** Routes de la box interrogées ici. */
const MODE_PATH = '/updater/getMode';
const CHECK_PASSWORD_PATH = '/updater/checkPassword';

/**
 * Budget d'une tentative de `checkPassword`, et nombre de tentatives. La box
 * répond en moins d'une seconde : au-delà de quelques secondes, l'appel est
 * perdu, pas lent.
 */
const CHECK_ATTEMPT_TIMEOUT_MS = 10000;
const CHECK_ATTEMPTS = 2;

/** Budget d'une sonde. Court : elle sera relancée. */
const PROBE_TIMEOUT_MS = 5000;

/**
 * Mode de la box. Seuls `setup` et `recovery` acceptent une configuration ;
 * `starting` et `connecting` sont des états de passage, qu'on attend.
 */
export type BoxModeName =
	| 'starting'
	| 'connecting'
	| 'setup'
	| 'recovery'
	| 'normal';

export type RecoveryReason = 'connection-failed' | 'manual' | null;

export interface BoxMode {
	mode: BoxModeName;
	recoveryReason: RecoveryReason;
	/** Réseau que la box a tenté (ou tente) de rejoindre, s'il y en a un. */
	ssid: string | null;
}

const MODES = new Set<BoxModeName>([
	'starting',
	'connecting',
	'setup',
	'recovery',
	'normal'
]);

/** Mode courant de la box, ou `null` si la réponse n'en est pas un. */
export async function getBoxMode(
	deviceId: string | undefined,
	timeoutMs = PROBE_TIMEOUT_MS
): Promise<BoxMode | null> {
	const url = await boxUrl(MODE_PATH, deviceId);
	const {status, body} = await boxGet(url, timeoutMs);
	if (status < 200 || status >= 300) {
		console.warn(`[boxMode] HTTP ${status} — ${body.slice(0, 200)}`);
		return null;
	}
	const parsed = parseBoxMode(body);
	if (!parsed) {
		console.warn(`[boxMode] réponse illisible — ${body.slice(0, 200)}`);
	}
	return parsed;
}

/** Vrai pour un mode de passage, qu'il suffit d'attendre. */
export function isTransientMode(mode: BoxModeName): boolean {
	return mode === 'starting' || mode === 'connecting';
}

export type WaitForStableModeOptions = PollOptions & {
	deviceId: string | undefined;
	/** Appelé à chaque mode lu, pour que l'écran dise où en est la box. */
	onProgress?: (mode: BoxMode) => void;
};

/**
 * Attend que la box quitte ses états de passage. Rend le premier mode stable
 * lu, ou `null` si elle n'en a atteint aucun dans le budget imparti.
 */
export async function waitForStableMode(
	options: WaitForStableModeOptions
): Promise<BoxMode | null> {
	const {deviceId, onProgress} = options;
	const stable = await pollUntil(async () => {
		const mode = await getBoxMode(deviceId);
		if (!mode) return undefined;
		onProgress?.(mode);
		return isTransientMode(mode.mode) ? undefined : mode;
	}, options);
	return stable ?? null;
}

/**
 * Verdict de la box sur un mot de passe :
 * - `valid` / `invalid` : elle a tranché ;
 * - `locked` : trop d'essais, elle n'en accepte plus pour l'instant ;
 * - `error` : elle a répondu, mais par une erreur qui ne dit rien du mot de
 *   passe (`status` porte le code HTTP) ;
 * - `unreachable` : aucune réponse.
 * Seul `valid` laisse continuer.
 */
export type PasswordVerdict =
	| {kind: 'valid'}
	| {kind: 'invalid'}
	| {kind: 'locked'}
	| {kind: 'error'; status: number}
	| {kind: 'unreachable'};

/** Corps d'erreur qui parle du mot de passe ou de l'authentification. */
const PASSWORD_REFUSAL = /password|mot de passe|invalid|incorrect|wrong|unauthori[sz]ed|forbidden/i;

/**
 * Demande à la box si `currentPassword` est celui qu'elle accepte aujourd'hui
 * pour `login` : l'étiquette en `setup`, celui de l'utilisateur en `recovery`.
 * Corps envoyé : `{login, currentPassword}`, comme dans `configure`.
 */
export async function checkBoxPassword(
	deviceId: string | undefined,
	login: string,
	currentPassword: string,
	timeoutMs = CHECK_ATTEMPT_TIMEOUT_MS
): Promise<PasswordVerdict> {
	let response: {status: number; body: string} | undefined;
	// La vérification ne change rien sur la box : une tentative restée sans
	// réponse est refaite une fois, sur une connexion neuve, plutôt que de
	// conclure trop tôt à une box injoignable.
	for (let attempt = 1; attempt <= CHECK_ATTEMPTS && !response; attempt++) {
		try {
			const url = await boxUrl(CHECK_PASSWORD_PATH, deviceId);
			response = await boxPost(url, {login, currentPassword}, timeoutMs);
		} catch (e) {
			console.warn(
				`[boxMode] checkPassword sans réponse (essai ${attempt}/${CHECK_ATTEMPTS}):`,
				e
			);
		}
	}
	if (!response) return {kind: 'unreachable'};

	const {status, body} = response;
	if (status >= 200 && status < 300) return parseVerdict(body);
	if (status === 401 || status === 403) return {kind: 'invalid'};
	if (status === 429) return {kind: 'locked'};
	console.warn(`[boxMode] checkPassword HTTP ${status} — ${body.slice(0, 200)}`);
	// Un refus porté par un autre code (400, 422…) reste un refus du mot de
	// passe quand le corps le dit.
	if (status >= 400 && status < 500 && PASSWORD_REFUSAL.test(body)) {
		return {kind: 'invalid'};
	}
	return {kind: 'error', status};
}

/**
 * Un 2xx vaut accord, sauf `false`, un objet portant une `error`, ou un objet
 * dont le verdict est faux.
 */
function parseVerdict(body: string): PasswordVerdict {
	const valid: PasswordVerdict = {kind: 'valid'};
	const invalid: PasswordVerdict = {kind: 'invalid'};
	const trimmed = body.trim();
	if (!trimmed) return valid;
	let parsed: any;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return trimmed.toLowerCase() === 'false' ? invalid : valid;
	}
	if (typeof parsed === 'boolean') return parsed ? valid : invalid;
	if (parsed && typeof parsed === 'object') {
		if (parsed.error) return invalid;
		for (const key of ['valid', 'success', 'ok', 'result']) {
			if (key in parsed) return parsed[key] ? valid : invalid;
		}
	}
	return valid;
}

function parseBoxMode(body: string): BoxMode | null {
	let parsed: any;
	try {
		parsed = JSON.parse(body);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object') return null;
	if (!MODES.has(parsed.mode)) return null;

	const reason = parsed.recoveryReason;
	return {
		mode: parsed.mode,
		recoveryReason:
			reason === 'connection-failed' || reason === 'manual' ? reason : null,
		ssid:
			typeof parsed.wifi?.ssid === 'string' && parsed.wifi.ssid !== ''
				? parsed.wifi.ssid
				: null
	};
}
