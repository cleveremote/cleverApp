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

/**
 * Parses the raw string carried by a CleverBox QR code.
 *
 * Always throws {@link HotspotError} with code `INVALID_QR` on any problem, so
 * the scanning screen has a single error shape to render.
 */
export function parseCleverBoxQr(raw: string): CleverBoxQrPayload {
	let decoded: unknown;
	try {
		decoded = JSON.parse(raw);
	} catch {
		invalid(i18n.t('access:qr.notCleverBox'));
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
