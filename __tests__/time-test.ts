import {
	durationToPickerDate,
	fromPickerDate,
	startOfDayIn,
	toPickerDate,
	pickerDateToDuration,
	serializeDatesDeep,
	toEpoch,
	wallClockIn,
	zonedToEpoch
} from '../src/services/time';
import {denormalizeIds} from '../src/services/socket/idNormalizer';

describe('heure murale', () => {
	it('lit l’heure d’un instant dans un fuseau', () => {
		// 2026-10-24 : Paris encore en heure d'été (UTC+2).
		const w = wallClockIn('Europe/Paris', Date.UTC(2026, 9, 24, 6, 30));
		expect(w).toMatchObject({year: 2026, month: 10, day: 24, hour: 8, minute: 30, weekday: 6});
	});

	it('convertit une heure murale en instant, de part et d’autre du changement d’heure', () => {
		const before = zonedToEpoch('Europe/Paris', {year: 2026, month: 10, day: 24, hour: 8, minute: 0});
		const after = zonedToEpoch('Europe/Paris', {year: 2026, month: 10, day: 26, hour: 8, minute: 0});
		expect(new Date(before).toISOString()).toBe('2026-10-24T06:00:00.000Z');
		expect(new Date(after).toISOString()).toBe('2026-10-26T07:00:00.000Z');
	});

	it('fait l’aller-retour instant -> heure murale -> instant', () => {
		const t = Date.UTC(2026, 10, 2, 13, 45);
		for (const tz of ['Africa/Casablanca', 'Europe/Paris', 'America/New_York', 'UTC']) {
			expect(zonedToEpoch(tz, wallClockIn(tz, t))).toBe(t);
		}
	});
});

describe('picker dans le fuseau de la box', () => {
	it('fait l’aller-retour instant -> picker -> instant', () => {
		const t = Date.UTC(2026, 10, 2, 13, 45);
		for (const tz of ['Africa/Casablanca', 'Europe/Paris', 'America/New_York']) {
			expect(fromPickerDate(tz, toPickerDate(tz, t))).toBe(t);
		}
	});

	it('donne minuit du jour dans le fuseau', () => {
		const t = Date.UTC(2026, 10, 2, 13, 45);
		expect(new Date(startOfDayIn('America/New_York', t)).toISOString()).toBe(
			'2026-11-02T05:00:00.000Z'
		);
	});
});

describe('instants vers le backend', () => {
	it('sérialise en profondeur les Date en ISO UTC', () => {
		const d = new Date(Date.UTC(2026, 10, 2, 7, 0));
		const cb = () => undefined;
		expect(
			serializeDatesDeep({a: d, list: [d, 1], nested: {b: d}, bad: new Date(NaN), cb})
		).toEqual({
			a: '2026-11-02T07:00:00.000Z',
			list: ['2026-11-02T07:00:00.000Z', 1],
			nested: {b: '2026-11-02T07:00:00.000Z'},
			bad: null,
			cb
		});
	});

	it('denormalizeIds convertit aussi les Date', () => {
		const d = new Date(Date.UTC(2026, 10, 2, 7, 0));
		expect(denormalizeIds({id: 'x', startDate: d})).toEqual({
			_id: 'x',
			startDate: '2026-11-02T07:00:00.000Z'
		});
	});

	it('relit un instant ISO ou epoch', () => {
		expect(toEpoch('2026-11-02T07:00:00.000Z')).toBe(Date.UTC(2026, 10, 2, 7, 0));
		expect(toEpoch(1793602800000)).toBe(1793602800000);
		expect(toEpoch(null)).toBeUndefined();
		expect(toEpoch('nope')).toBeUndefined();
	});
});

describe('durées saisies au picker', () => {
	it('fait l’aller-retour ms -> picker -> ms', () => {
		for (const ms of [0, 90 * 60000, 23 * 3600000 + 59 * 60000]) {
			expect(pickerDateToDuration(durationToPickerDate(ms))).toBe(ms);
		}
		expect(pickerDateToDuration(durationToPickerDate(undefined))).toBe(0);
	});
});
