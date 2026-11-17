import i18n from 'i18next';
import {
	CleverBoxQrPayload,
	HotspotError,
	WifiSecurity
} from './types';

const SECURITIES: WifiSecurity[] = ['WPA3', 'WPA2', 'WPA', 'WEP', 'OPEN'];

const IPV4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const LOCAL_SUFFIX = '.local';

/**
 * Schéma et hôte du lien d'appairage : `cleverapp://box?ssid=…&password=…`.
 *
 * Un QR code qui porte du JSON n'est que du texte pour l'appareil photo du
 * téléphone. Sous forme de lien, il ouvre l'application — le schéma est déclaré
 * dans AndroidManifest.xml et Info.plist, à garder identiques à cette valeur.
 */
export const BOX_LINK_SCHEME = 'cleverapp';
export const BOX_LINK_HOST = 'box';

const BOX_LINK = new RegExp(
	`^${BOX_LINK_SCHEME}://${BOX_LINK_HOST}/?(?:\\?([^#]*))?(?:#.*)?$`,
	'i'
);

const invalid = (message: string): never => {
	throw new HotspotError('INVALID_QR', message);
};

const asString = (value: unknown, field: string): string => {
	if (typeof value !== 'string' || value.trim() === '') {
		invalid(i18n.t('access:qr.missingField', {field}));
	}
	return (value as string).trim();
};

/**
 * Normalizes the `host` field to an mDNS hostname.
 *
 * The box certificate is issued for `DNS:<hostname>.local`, and both platforms
 * verify it: Android resolves `.local` through MdnsDns (plugged in as OkHttp's
 * Dns), iOS through Bonjour. An IP address would resolve fine but fail hostname
 * verification, so it is rejected outright rather than silently downgrading TLS.
 */
export function normalizeHost(rawHost: unknown): string {
	const host = asString(rawHost, 'host')
		.toLowerCase()
		.replace(/\.$/, ''); // tolerate a fully-qualified trailing dot

	if (IPV4.test(host)) {
		invalid(i18n.t('access:qr.hostIsIp', {host}));
	}
	if (host.includes(':') || host.includes('/')) {
		invalid(i18n.t('access:qr.hostHasPort', {host}));
	}

	// Tolerate a bare name in the QR code, e.g. "CleverBox-4F8A".
	const fqdn = host.includes('.') ? host : `${host}${LOCAL_SUFFIX}`;

	if (!fqdn.endsWith(LOCAL_SUFFIX)) {
		invalid(i18n.t('access:qr.hostNotLocal', {host}));
	}
	if (fqdn.length > 253) {
		invalid(i18n.t('access:qr.hostTooLong'));
	}

	const labels = fqdn.split('.');
	for (const label of labels) {
		if (label.length === 0 || label.length > 63 || !LABEL.test(label)) {
			invalid(i18n.t('access:qr.hostInvalid', {host}));
		}
	}

	return fqdn;
}

function normalizePort(value: unknown): number {
	const port = typeof value === 'string' ? Number(value) : value;
	if (
		typeof port !== 'number' ||
		!Number.isInteger(port) ||
		port < 1 ||
		port > 65535
	) {
		invalid(i18n.t('access:qr.portInvalid', {port: String(value)}));
	}
	return port as number;
}

function normalizeSecurity(value: unknown): WifiSecurity {
	const security = asString(value, 'security').toUpperCase();
	if (!SECURITIES.includes(security as WifiSecurity)) {
		invalid(
			i18n.t('access:qr.securityUnknown', {
				security,
				expected: SECURITIES.join(', ')
			})
		);
	}
	return security as WifiSecurity;
}

/** Vrai pour un lien d'appairage, quel que soit son contenu. */
export function isCleverBoxLink(raw: string): boolean {
	return BOX_LINK.test(raw.trim());
}

/**
 * Lit les champs d'un lien d'appairage, ou rend `null` si ce n'en est pas un.
 *
 * Les champs sont ceux du JSON, passés en paramètres encodés. Un `+` vaut une
 * espace, comme dans un formulaire : `encodeURIComponent` comme `urlencode`
 * écrivent `%2B` pour un vrai `+`, donc les deux générateurs sont lus juste.
 */
function decodeLink(raw: string): Record<string, unknown> | null {
	const match = BOX_LINK.exec(raw);
	if (!match) return null;

	// Le lien dit déjà qu'il s'agit d'une box : `type` y est facultatif.
	const data: Record<string, unknown> = {type: 'cleverbox'};
	for (const pair of (match[1] ?? '').split('&')) {
		if (pair === '') continue;
		const separator = pair.indexOf('=');
		const key = separator === -1 ? pair : pair.slice(0, separator);
		const value = separator === -1 ? '' : pair.slice(separator + 1);
		try {
			data[decodeURIComponent(key)] = decodeURIComponent(
				value.replace(/\+/g, ' ')
			);
		} catch {
			invalid(i18n.t('access:qr.notCleverBox'));
		}
	}
	return data;
}

/**
 * Parses the raw string carried by a CleverBox QR code: either the pairing
 * link (`cleverapp://box?…`) or the older bare JSON object.
 *
 * Always throws {@link HotspotError} with code `INVALID_QR` on any problem, so
 * the scanning screen has a single error shape to render.
 */
export function parseCleverBoxQr(raw: string): CleverBoxQrPayload {
	let decoded: unknown = decodeLink(raw.trim());
	if (decoded === null) {
		try {
			decoded = JSON.parse(raw);
		} catch {
			invalid(i18n.t('access:qr.notCleverBox'));
		}
	}

	if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
		invalid(i18n.t('access:qr.notCleverBox'));
	}

	const data = decoded as Record<string, unknown>;

	if (data.type !== 'cleverbox') {
		invalid(i18n.t('access:qr.wrongType', {type: String(data.type)}));
	}

	const security = normalizeSecurity(data.security);
	// An open network legitimately carries no passphrase.
	const password =
		security === 'OPEN' ? '' : asString(data.password, 'password');

	return {
		type: 'cleverbox',
		ssid: asString(data.ssid, 'ssid'),
		password,
		security,
		host: normalizeHost(data.host),
		port: normalizePort(data.port),
		deviceId: asString(data.deviceId, 'deviceId')
	};
}
