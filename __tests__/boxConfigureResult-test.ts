import {
	ConfigureResult,
	boxLocationAfter,
	configureOutcome,
	configureSendResult,
	extractErrorCode,
	parseConfigureResult
} from '../src/services/http/boxConfigureResult';

const result = (overrides: Partial<ConfigureResult> = {}): ConfigureResult => ({
	status: 'idle',
	errorCode: null,
	ssid: 'Maison',
	startedAt: '2026-11-16T10:00:00.000Z',
	finishedAt: null,
	...overrides
});

describe('parseConfigureResult', () => {
	it('lit un résultat complet', () => {
		expect(
			parseConfigureResult({
				status: 'succeeded',
				errorCode: null,
				ssid: 'Maison',
				startedAt: '2026-11-16T10:00:00.000Z',
				finishedAt: '2026-11-16T10:00:14.000Z'
			})
		).toEqual({
			status: 'succeeded',
			errorCode: null,
			ssid: 'Maison',
			startedAt: '2026-11-16T10:00:00.000Z',
			finishedAt: '2026-11-16T10:00:14.000Z'
		});
	});

	it('rend null quand le champ est absent ou illisible', () => {
		expect(parseConfigureResult(undefined)).toBeNull();
		expect(parseConfigureResult('succeeded')).toBeNull();
		expect(parseConfigureResult({status: 'done'})).toBeNull();
	});

	it('garde le code d’un échec', () => {
		expect(
			parseConfigureResult({status: 'failed', errorCode: 'WIFI_INVALID_PSK'})
				?.errorCode
		).toBe('WIFI_INVALID_PSK');
	});

	it('ramène un échec sans code connu au code générique', () => {
		expect(
			parseConfigureResult({status: 'failed', errorCode: 'WIFI_NEW_CODE'})
				?.errorCode
		).toBe('CONFIGURE_FAILED');
		expect(parseConfigureResult({status: 'failed'})?.errorCode).toBe(
			'CONFIGURE_FAILED'
		);
	});

	it('ignore un code hors échec', () => {
		expect(
			parseConfigureResult({status: 'in-progress', errorCode: 'WIFI_TIMEOUT'})
				?.errorCode
		).toBeNull();
	});
});

describe('extractErrorCode', () => {
	it('trouve le code quelle que soit la forme du corps', () => {
		expect(extractErrorCode('{"message":"VALIDATION_FAILED"}')).toBe(
			'VALIDATION_FAILED'
		);
		expect(
			extractErrorCode('{"statusCode":409,"code":"CONFIGURE_IN_PROGRESS"}')
		).toBe('CONFIGURE_IN_PROGRESS');
		expect(extractErrorCode('INVALID_CURRENT_PASSWORD')).toBe(
			'INVALID_CURRENT_PASSWORD'
		);
	});

	it('rend null sans code connu', () => {
		expect(extractErrorCode('')).toBeNull();
		expect(extractErrorCode('{"message":"Bad Request"}')).toBeNull();
	});
});

describe('boxLocationAfter', () => {
	it('situe la box sur son point d’accès après un échec Wi-Fi', () => {
		expect(boxLocationAfter('WIFI_INVALID_PSK')).toBe('hotspot');
		expect(boxLocationAfter('WIFI_OPERATION_FAILED')).toBe('hotspot');
	});

	it('la situe sur le réseau domestique quand le Wi-Fi a abouti', () => {
		expect(boxLocationAfter('USER_SAVE_FAILED')).toBe('lan');
		expect(boxLocationAfter('LOCAL_COORDINATES_SAVE_FAILED')).toBe('lan');
		expect(boxLocationAfter('HOTSPOT_STOP_FAILED')).toBe('lan');
	});

	it('ne la situe pas après une erreur inattendue', () => {
		expect(boxLocationAfter('CONFIGURE_FAILED')).toBe('unknown');
	});
});

describe('configureOutcome', () => {
	it('attend tant que la bascule est en cours', () => {
		expect(
			configureOutcome({
				mode: 'connecting',
				configure: result({status: 'in-progress'})
			})
		).toEqual({kind: 'pending'});
	});

	it('conclut au succès', () => {
		expect(
			configureOutcome({
				mode: 'normal',
				configure: result({status: 'succeeded'})
			})
		).toEqual({kind: 'succeeded'});
	});

	it('remonte le code d’un échec', () => {
		expect(
			configureOutcome({
				mode: 'recovery',
				configure: result({status: 'failed', errorCode: 'WIFI_INVALID_PSK'})
			})
		).toEqual({kind: 'failed', code: 'WIFI_INVALID_PSK'});
	});

	it('se fie au mode quand la box n’a pas de résultat', () => {
		const idle = result();
		expect(configureOutcome({mode: 'normal', configure: idle})).toEqual({
			kind: 'succeeded'
		});
		expect(configureOutcome({mode: 'setup', configure: idle})).toEqual({
			kind: 'notApplied'
		});
		expect(configureOutcome({mode: 'recovery', configure: idle})).toEqual({
			kind: 'notApplied'
		});
		expect(configureOutcome({mode: 'starting', configure: idle})).toEqual({
			kind: 'pending'
		});
	});

	it('lit comme idle une box qui ne publie pas le champ', () => {
		expect(configureOutcome({mode: 'normal', configure: null})).toEqual({
			kind: 'succeeded'
		});
		expect(configureOutcome({mode: 'setup', configure: null})).toEqual({
			kind: 'notApplied'
		});
	});

	it('écarte le résultat d’une tentative précédente', () => {
		const previous = result({status: 'succeeded'});
		expect(
			configureOutcome(
				{mode: 'recovery', configure: previous},
				previous.startedAt
			)
		).toEqual({kind: 'notApplied'});
		expect(
			configureOutcome(
				{mode: 'recovery', configure: previous},
				'2026-11-16T09:00:00.000Z'
			)
		).toEqual({kind: 'succeeded'});
	});
});

describe('configureSendResult', () => {
	it('lit un 2xx comme un accord', () => {
		expect(configureSendResult(200, '')).toEqual({kind: 'accepted'});
		expect(configureSendResult(202, '{"status":"in-progress"}')).toEqual({
			kind: 'accepted'
		});
	});

	it('remonte le code d’un refus', () => {
		expect(
			configureSendResult(401, '{"code":"INVALID_CURRENT_PASSWORD"}')
		).toEqual({kind: 'refused', code: 'INVALID_CURRENT_PASSWORD'});
		expect(
			configureSendResult(200, '{"error":"VALIDATION_FAILED"}')
		).toEqual({kind: 'refused', code: 'VALIDATION_FAILED'});
	});

	it('lit un 401 sans code comme un mot de passe refusé', () => {
		expect(configureSendResult(401, 'Unauthorized')).toEqual({
			kind: 'refused',
			code: 'INVALID_CURRENT_PASSWORD'
		});
	});

	it('laisse getMode trancher quand une configuration est déjà en cours', () => {
		expect(
			configureSendResult(409, '{"code":"CONFIGURE_IN_PROGRESS"}')
		).toEqual({kind: 'accepted'});
	});

	it('ne conclut rien d’une erreur serveur sans code', () => {
		expect(configureSendResult(502, 'Bad Gateway')).toEqual({kind: 'lost'});
	});

	it('ramène un refus sans code au code générique', () => {
		expect(configureSendResult(400, '{"message":"Bad Request"}')).toEqual({
			kind: 'refused',
			code: 'CONFIGURE_FAILED'
		});
	});
});
