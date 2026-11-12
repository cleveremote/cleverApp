import {NativeModules, Platform} from 'react-native';
import {initSSL} from '../socket/SSLConfig';
import {getBoxEndpoint} from '../hotspot';

const {SSLCAModule} = NativeModules;

export type BoxResponse = {
	status: number;
	body: string;
};

/**
 * Absolute URL of a box route, built from the endpoint scanned at pairing time
 * for the box `deviceId`.
 *
 * When nothing was scanned for that box, falls back to its mDNS name
 * `<deviceId>.local`. Without a `deviceId` at all there is no box to reach, so
 * it throws. The port is only spelled out when it is not the default one: the
 * box certificate is issued for `DNS:<host>`, and a needless `:443` only makes
 * the logs harder to read.
 */
export async function boxUrl(
	path: string,
	deviceId: string | undefined
): Promise<string> {
	const suffix = path.startsWith('/') ? path : `/${path}`;
	const endpoint = await getBoxEndpoint(deviceId);
	if (!endpoint) {
		const name = deviceId
			?.trim()
			.replace(/\.local$/i, '')
			.toLowerCase();
		if (name) return `https://${name}.local${suffix}`;
		throw new Error('No box to reach: missing deviceId');
	}

	const authority =
		endpoint.port === 443
			? endpoint.host
			: `${endpoint.host}:${endpoint.port}`;
	return `https://${authority}${suffix}`;
}

/**
 * Pas de connexion gardée ouverte vers la box (Android). Sur le hotspot, une
 * connexion inactive pendant la saisie peut être morte sans que le téléphone
 * le sache : la requête suivante y est écrite et l'appel attend jusqu'à son
 * délai, alors que la box est là. Une connexion par appel coûte une poignée
 * de main TLS, négligeable au rythme de ces écrans.
 */
const FRESH_CONNECTION = {Connection: 'close'};

/**
 * GET on the box over HTTPS, trusting the bundled private CA.
 *
 * The two platforms get there differently, which is why this helper exists:
 *
 * - Android: plain `fetch` is enough. CustomOkHttpClientFactory already gives
 *   React Native's network client the CA and an mDNS resolver for `.local`.
 * - iOS: `fetch` goes through RCTHTTPRequestHandler, whose NSURLSession has no
 *   authentication delegate — it checks the box certificate against the system
 *   trust store only and rejects it. The native `SSLCAModule.get` runs the same
 *   request through the session that knows the CA.
 */
export async function boxGet(
	url: string,
	timeoutMs = 10000
): Promise<BoxResponse> {
	return timed('GET', url, async () => {
		if (Platform.OS === 'ios') {
			// The trusted session is built by initialize(); on the pairing screen
			// no socket has connected yet, so it may not exist. initSSL is
			// idempotent.
			await initSSL();
			return SSLCAModule.get(url, timeoutMs);
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetch(url, {
				method: 'GET',
				headers: FRESH_CONNECTION,
				signal: controller.signal
			});
			return {status: res.status, body: await res.text()};
		} finally {
			clearTimeout(timer);
		}
	});
}

/**
 * Logs how long a failed box call took before it blew up.
 *
 * Worth the noise on this transport specifically: the box is reached over mDNS
 * on a link the phone is in the middle of switching, so a call that looks like
 * a plain failure from JS is usually a call that spent its whole budget opening
 * a connection — and the box then logs the request arriving well after the
 * screen moved on. The elapsed time is what tells the two apart.
 */
async function timed(
	method: string,
	url: string,
	run: () => Promise<BoxResponse>
): Promise<BoxResponse> {
	const startedAt = Date.now();
	try {
		return await run();
	} catch (e) {
		console.warn(
			`[boxHttp] ${method} ${url} → failed after ${
				Date.now() - startedAt
			}ms:`,
			e
		);
		throw e;
	}
}

export type PollOptions = {
	/** Budget total avant d'abandonner. */
	timeoutMs?: number;
	/** Attente entre deux essais. */
	intervalMs?: number;
	/** Renvoyer `false` arrête la boucle — typiquement au démontage de l'écran. */
	shouldContinue?: () => boolean;
};

const POLL_DEFAULTS = {
	timeoutMs: 90000,
	intervalMs: 2000
};

/**
 * Répète `probe` jusqu'à ce qu'elle rende un verdict, ou que le budget soit
 * épuisé — `undefined` signifiant « pas encore ».
 *
 * C'est le rythme de toute interrogation de la box pendant une bascule réseau :
 * elle quitte son point d'accès pour rejoindre le Wi-Fi demandé, et rien ne dit
 * quand elle réapparaîtra — ni quand le téléphone y sera revenu lui aussi. Un
 * essai qui échoue est donc une étape normale de l'attente, pas une erreur à
 * remonter, et c'est pourquoi les exceptions sont avalées ici.
 */
export async function pollUntil<T>(
	probe: () => Promise<T | undefined>,
	options: PollOptions = {}
): Promise<T | undefined> {
	const {timeoutMs, intervalMs} = {...POLL_DEFAULTS, ...options};
	const shouldContinue = options.shouldContinue ?? (() => true);
	const deadline = Date.now() + timeoutMs;

	while (shouldContinue()) {
		try {
			const verdict = await probe();
			if (verdict !== undefined) return verdict;
		} catch {
			// Box pas encore revenue, téléphone encore hors du bon réseau, nom
			// non résolu : tous mènent au même endroit — un nouvel essai.
		}

		if (Date.now() + intervalMs >= deadline) return undefined;
		await new Promise<void>(resolve =>
			setTimeout(() => resolve(), intervalMs)
		);
	}

	return undefined;
}

/** JSON POST on the box, over the same trusted transport as {@link boxGet}. */
export async function boxPost(
	url: string,
	body: unknown,
	timeoutMs = 10000
): Promise<BoxResponse> {
	const payload = JSON.stringify(body ?? {});

	return timed('POST', url, async () => {
		if (Platform.OS === 'ios') {
			await initSSL();
			return SSLCAModule.post(url, payload, timeoutMs);
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {'Content-Type': 'application/json', ...FRESH_CONNECTION},
				body: payload,
				signal: controller.signal
			});
			return {status: res.status, body: await res.text()};
		} finally {
			clearTimeout(timer);
		}
	});
}
