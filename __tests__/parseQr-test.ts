import {isCleverBoxLink, parseCleverBoxQr} from '../src/services/hotspot/parseQr';
import {HotspotError} from '../src/services/hotspot/types';

const expected = {
	type: 'cleverbox',
	ssid: 'cleveremote-setup',
	password: 'Nya 0113?+&=',
	security: 'WPA2',
	host: 'zc080obf.local',
	port: 443,
	deviceId: 'zc080obf'
};

const link =
	'cleverapp://box?ssid=cleveremote-setup&password=Nya%200113%3F%2B%26%3D' +
	'&security=WPA2&host=zc080obf&port=443&deviceId=zc080obf';

describe('parseCleverBoxQr', () => {
	it('lit le JSON historique', () => {
		expect(
			parseCleverBoxQr(JSON.stringify({...expected, host: 'zc080obf'}))
		).toEqual(expected);
	});

	it('lit le lien d’appairage', () => {
		expect(parseCleverBoxQr(link)).toEqual(expected);
	});

	it('lit un lien encodé comme un formulaire', () => {
		expect(
			parseCleverBoxQr(link.replace('Nya%200113', 'Nya+0113'))
		).toEqual(expected);
	});

	it('tolère la casse du schéma et une barre avant les paramètres', () => {
		expect(
			parseCleverBoxQr(link.replace('cleverapp://box?', 'CleverApp://box/?'))
		).toEqual(expected);
	});

	it('refuse un lien incomplet', () => {
		expect(() =>
			parseCleverBoxQr(link.replace('&deviceId=zc080obf', ''))
		).toThrow(HotspotError);
		expect(() => parseCleverBoxQr('cleverapp://box')).toThrow(HotspotError);
	});

	it('refuse un encodage cassé et un autre lien', () => {
		expect(() => parseCleverBoxQr(`${link}&x=%E0%A4%A`)).toThrow(
			HotspotError
		);
		expect(() => parseCleverBoxQr('https://example.com/box?ssid=a')).toThrow(
			HotspotError
		);
	});
});

describe('isCleverBoxLink', () => {
	it('ne reconnaît que le lien d’appairage', () => {
		expect(isCleverBoxLink(link)).toBe(true);
		expect(isCleverBoxLink('cleverapp://box')).toBe(true);
		expect(isCleverBoxLink('cleverapp://boxes?ssid=a')).toBe(false);
		expect(isCleverBoxLink('cleverapp://other?ssid=a')).toBe(false);
	});
});
