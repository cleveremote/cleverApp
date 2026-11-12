import {fieldLabelColor,
	fieldLabelText,
	inputText,
	InputStyle,
	placeholderColor
} from '../../../../../styles/components/common/Input';
import {ELEMENT_HEIGHT} from '../../../../../styles/metrics';
import React from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faCalendarDays, faCheck, faPen} from '@fortawesome/free-solid-svg-icons';
import {pickerLocaleProps} from '../../../../../components/common/pickerLocale';
import {connect, useSelector} from 'react-redux';
import i18n from 'i18next';
import {AppSwitch} from '../../../../../components/common/AppSwitch';
import {TimeZoneNotice} from '../../../../../components/common/TimeZoneNotice';
import {WarningBox} from '../../../../../components/common/WarningBox';
import {InfoBox, INFO_COLORS} from '../../../../../components/common/InfoBox';
import {SolarTriggerFields} from '../../../../../components/common/SolarTriggerFields';
import {ModalRangePicker} from '../../../../../components/common/ModalRangePicker';
import {ModalCard} from '../../../../../components/common/ModalCard';
import {OutlineButton} from '../../../../access/accessUi';
import {updateSchedule} from '../../../../../../module/process/infrasctructure/store/actions/schedule';
import {
	selectBoxCoordinates,
	selectBoxTimeZone
} from '../../../../../../module/process/infrasctructure/store/models/boxSettings';
import {
	fromPickerDate,
	toEpoch,
	toPickerDate,
	toUtcIso,
	wallClockIn,
	zonedToEpoch
} from '../../../../../../services/time';

/**
 * NewSchedulingSection — interface unique de planification d'un schedule.
 *
 * Builder cron champ par champ (chaque / liste / intervalle / pas / texte libre),
 * déclencheur solaire (combiner / remplacer) et date ponctuelle, avec aperçu des
 * prochaines exécutions.
 *
 * Branché au modèle `schedule.cron` : `dtoToState` initialise l'interface depuis
 * les données, `mapToDto` re-sérialise vers `{ pattern, date, sunBehavior }` et
 * stage dans redux via `updateSchedule`. Remplace l'ancienne section Execution.
 *
 * Réutilisable hors schedule (ex. fréquence de lecture d'un sensor) : `cron`
 * remplace `scheduleData.cron`, `onChange(dto)` remplace le staging redux, et
 * `cronOnly` masque la date ponctuelle et le déclencheur solaire, `hideRuns`
 * masque les prochaines exécutions, `hidePreview`
 * masque l'expression et les prochaines exécutions. `editInModal` n'affiche
 * que l'expression (pause / confirmation après son explication) et les
 * prochaines exécutions ; le builder s'ouvre dans une popin via le bouton
 * planification à côté de l'expression.
 *
 * Fuseau : la box interprète les crons dans son propre fuseau
 * (`settings.timeZone`). Toutes les heures affichées ou saisies ici sont donc
 * en heure de la box, pas du téléphone ; la date ponctuelle part en ISO UTC.
 */

// --- Palette alignée sur le design system de l'app (Chakra-like) -----------
// Accent slate #32404e (comme le track des switches), bordures #CBD5E0,
// rouge d'erreur #FC8181. L'état « actif » = fond slate plein + texte blanc.
const C = {
	accent: '#32404e',
	chipActiveBg: '#32404e',
	chipActiveBorder: '#32404e',
	surface: '#ffffff',
	surface2: '#F7FAFC',
	border: '#CBD5E0',
	muted: fieldLabelColor,
	secondary: '#4A5568',
	text: '#32404e'
};

// --- Configuration des champs cron -----------------------------------------
type FieldKey = 'sec' | 'min' | 'hour' | 'dom' | 'month' | 'dow';

const FIELDCFG: Record<
	FieldKey,
	{
		label: string;
		lo: number;
		hi: number;
		type: 'num' | 'name';
		names?: string[];
		base?: number;
	}
> = {
	// Libellés en getters : lus dans la langue courante à chaque rendu.
	sec: {
		get label() {
			return i18n.t('cycle:cron.field.sec');
		},
		lo: 0,
		hi: 59,
		type: 'num'
	},
	min: {
		get label() {
			return i18n.t('cycle:cron.field.min');
		},
		lo: 0,
		hi: 59,
		type: 'num'
	},
	hour: {
		get label() {
			return i18n.t('cycle:cron.field.hour');
		},
		lo: 0,
		hi: 23,
		type: 'num'
	},
	dom: {
		get label() {
			return i18n.t('cycle:cron.field.dom');
		},
		lo: 1,
		hi: 31,
		type: 'num'
	},
	month: {
		get label() {
			return i18n.t('cycle:cron.field.month');
		},
		lo: 1,
		hi: 12,
		type: 'name',
		get names() {
			return toNameList(i18n.t('cycle:cron.months', {returnObjects: true}));
		},
		base: 1
	},
	dow: {
		get label() {
			return i18n.t('cycle:cron.field.dow');
		},
		lo: 0,
		hi: 6,
		type: 'name',
		get names() {
			return toNameList(i18n.t('cycle:cron.weekdays', {returnObjects: true}));
		},
		base: 0
	}
};

// Locale files store name lists as {"0": ..., "1": ...}; normalize to an array.
function toNameList(v: unknown): string[] {
	if (Array.isArray(v)) return v as string[];
	if (v && typeof v === 'object') {
		return Object.keys(v)
			.sort((a, b) => Number(a) - Number(b))
			.map(k => String((v as Record<string, unknown>)[k]));
	}
	return [];
}

// Nombre de prochaines exécutions affichées dans l'aperçu.
const RUNS_PREVIEW = 4;

const ORDER: FieldKey[] = ['sec', 'min', 'hour', 'dom', 'month', 'dow'];
const DAYORDER: FieldKey[] = ['dom', 'month', 'dow'];
const TABLABEL: Record<FieldKey, string> = {
	get sec() {
		return i18n.t('cycle:cron.tab.sec');
	},
	get min() {
		return i18n.t('cycle:cron.tab.min');
	},
	get hour() {
		return i18n.t('cycle:cron.tab.hour');
	},
	get dom() {
		return i18n.t('cycle:cron.tab.dom');
	},
	get month() {
		return i18n.t('cycle:cron.tab.month');
	},
	get dow() {
		return i18n.t('cycle:cron.tab.dow');
	}
};
// Aperçu solaire tant que la box n'a pas de coordonnées.
const DEFAULT_LAT = 48.85;
const DEFAULT_LON = 2.35;

type FieldMode = 'every' | 'list' | 'range' | 'step' | 'free';
interface FieldState {
	mode: FieldMode;
	list: number[];
	from: number;
	to: number;
	step: number;
	stepBase: 'every' | 'range';
	free: string;
}
interface SolarState {
	enabled: boolean;
	mode: 'combine' | 'replace';
	event: 'SUNRISE' | 'SUNSET';
	dir: 'BEFORE' | 'AFTER';
	offsetH: number;
	offsetM: number;
	lat: number;
	lon: number;
}
interface OneTimeState {
	enabled: boolean;
	date: number; // timestamp de la date ponctuelle
}
interface CronState {
	tab: FieldKey;
	fields: Record<FieldKey, FieldState>;
	solar: SolarState;
	oneTime: OneTimeState;
}

const initialState: CronState = {
	tab: 'min',
	fields: {
		sec: {mode: 'list', list: [0], from: 0, to: 0, step: 1, stepBase: 'every', free: ''},
		min: {mode: 'list', list: [0], from: 0, to: 0, step: 5, stepBase: 'every', free: ''},
		hour: {mode: 'list', list: [0], from: 0, to: 0, step: 1, stepBase: 'every', free: ''},
		dom: {mode: 'every', list: [1], from: 1, to: 1, step: 1, stepBase: 'every', free: ''},
		month: {mode: 'every', list: [1], from: 1, to: 1, step: 1, stepBase: 'every', free: ''},
		dow: {mode: 'list', list: [1, 4], from: 0, to: 6, step: 1, stepBase: 'every', free: ''}
	},
	solar: {
		enabled: false,
		mode: 'combine',
		event: 'SUNSET',
		dir: 'BEFORE',
		offsetH: 0,
		offsetM: 30,
		lat: DEFAULT_LAT,
		lon: DEFAULT_LON
	},
	oneTime: {
		enabled: false,
		date: Date.now()
	}
};

// --- Génération d'expression cron ------------------------------------------
// Nom complet (« janvier », « lundi ») pour l'explication de la cron.
function fullNameOf(key: FieldKey, v: number): string {
	const names =
		key === 'month'
			? toNameList(i18n.t('cycle:cron.monthsLong', {returnObjects: true}))
			: key === 'dow'
			? toNameList(i18n.t('cycle:cron.weekdaysLong', {returnObjects: true}))
			: null;
	if (!names) return nameOf(key, v);
	return names[FIELDCFG[key].base === 0 ? v : v - 1] ?? nameOf(key, v);
}

function nameOf(key: FieldKey, v: number): string {
	const cfg = FIELDCFG[key];
	if (cfg.type !== 'name' || !cfg.names) return String(v);
	return cfg.names[cfg.base === 0 ? v : v - 1];
}

function fieldString(s: CronState, key: FieldKey): string {
	const f = s.fields[key];
	if (f.mode === 'every') return '*';
	if (f.mode === 'free') return f.free.trim() || '*';
	if (f.mode === 'list')
		return f.list.length
			? f.list
					.slice()
					.sort((a, b) => a - b)
					.join(',')
			: '*';
	if (f.mode === 'range') return f.from + '-' + f.to;
	if (f.mode === 'step') {
		const base = f.stepBase === 'every' ? '*' : f.from + '-' + f.to;
		return base + '/' + f.step;
	}
	return '*';
}

function buildCronFields(s: CronState): string[] {
	// Les secondes sont toujours incluses.
	return ORDER.map(k => fieldString(s, k));
}
function buildCronStr(s: CronState): string {
	return buildCronFields(s).join(' ');
}
// En mode « combiner », seul jour/mois/semaine du cron est pertinent (heure,
// minute, seconde étant remplacées par le déclencheur solaire).
function buildDayCronStr(s: CronState): string {
	return DAYORDER.map(k => fieldString(s, k)).join(' ');
}

// Date ponctuelle -> expression cron (sec min heure jour mois *) correspondante,
// en heure de la box.
function oneTimeCronStr(ts: number, tz: string): string {
	const w = wallClockIn(tz, ts);
	return [w.second, w.minute, w.hour, w.day, w.month, '*'].join(' ');
}

// Libellé lisible d'une date ponctuelle, en heure de la box.
function formatOneTime(ts: number, tz: string): string {
	return new Date(ts).toLocaleString(i18n.language, {
		timeZone: tz,
		weekday: 'long',
		day: '2-digit',
		month: 'long',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

// --- Analyse inverse : cron texte -> état de l'interface --------------------
// Convertit un jeton cron d'un champ (ex: "*", "0,15", "1-5", "*/5", "1-5/2")
// en FieldState. Tout ce qui n'est pas reconnu retombe en mode « texte libre »
// pour préserver l'aller-retour (ex: L, W, #, noms de mois/jours).
function tokenToField(token: string, cfg: (typeof FIELDCFG)[FieldKey]): FieldState {
	const f: FieldState = {
		mode: 'every',
		list: [cfg.lo],
		from: cfg.lo,
		to: cfg.hi,
		step: 1,
		stepBase: 'every',
		free: ''
	};
	const t = token.trim();
	if (t === '' || t === '*') return f;
	if (/^\d+(,\d+)*$/.test(t)) {
		f.mode = 'list';
		f.list = t.split(',').map(Number);
		return f;
	}
	if (/^\d+-\d+$/.test(t)) {
		const [a, b] = t.split('-').map(Number);
		f.mode = 'range';
		f.from = a;
		f.to = b;
		return f;
	}
	if (/^\*\/\d+$/.test(t)) {
		f.mode = 'step';
		f.stepBase = 'every';
		f.step = Number(t.split('/')[1]) || 1;
		return f;
	}
	if (/^\d+-\d+\/\d+$/.test(t)) {
		const [range, st] = t.split('/');
		const [a, b] = range.split('-').map(Number);
		f.mode = 'step';
		f.stepBase = 'range';
		f.from = a;
		f.to = b;
		f.step = Number(st) || 1;
		return f;
	}
	f.mode = 'free';
	f.free = t;
	return f;
}

// Applique une expression cron complète (5 ou 6 champs) sur l'état. En 5 champs
// (min heure jour mois semaine), les secondes passent en « chaque ».
function applyCronString(draft: CronState, str: string): void {
	const tokens = str.trim().split(/\s+/).filter(Boolean);
	if (tokens.length >= 6) {
		ORDER.forEach((k, i) => {
			draft.fields[k] = tokenToField(tokens[i], FIELDCFG[k]);
		});
	} else if (tokens.length === 5) {
		draft.fields.sec = tokenToField('*', FIELDCFG.sec);
		const keys: FieldKey[] = ['min', 'hour', 'dom', 'month', 'dow'];
		keys.forEach((k, i) => {
			draft.fields[k] = tokenToField(tokens[i], FIELDCFG[k]);
		});
	} else if (tokens.length === 3) {
		// Pattern de mode « combiner » : jour/mois/semaine uniquement.
		DAYORDER.forEach((k, i) => {
			draft.fields[k] = tokenToField(tokens[i], FIELDCFG[k]);
		});
	}
	// Autre nombre de champs : expression incomplète, on ne modifie rien.
}

// Mode « combiner » : l'expression ne porte que jour/mois/semaine (3 champs).
function applyDayCronString(draft: CronState, str: string): void {
	const tokens = str.trim().split(/\s+/).filter(Boolean);
	if (tokens.length >= 3) {
		DAYORDER.forEach((k, i) => {
			draft.fields[k] = tokenToField(tokens[i], FIELDCFG[k]);
		});
	}
}

// --- Correspondance avec le modèle de données `schedule.cron` ---------------
// sunBehavior sérialise timeDirection au même niveau que sunState (non imbriqué).
interface SunBehaviorDto {
	sunState: 'SUNRISE' | 'SUNSET';
	timeDirection: 'BEFORE' | 'AFTER';
	time: number; // décalage en ms
}
interface CronDto {
	pattern: string | null;
	// Instant ISO 8601 UTC ; les anciennes données portent un epoch ms.
	date: string | number | null;
	sunBehavior?: SunBehaviorDto;
	after?: number;
}

// État de l'interface -> DTO cron (staging vers redux).
function mapToDto(s: CronState): CronDto {
	if (s.oneTime.enabled) {
		return {
			date: toUtcIso(s.oneTime.date),
			pattern: null,
			sunBehavior: undefined,
			after: undefined
		};
	}
	const sol = s.solar;
	if (sol.enabled) {
		return {
			// Combiner : on conserve l'expression jour/mois/semaine ; Remplacer :
			// le cron est ignoré (pattern null), seul le solaire pilote.
			pattern: sol.mode === 'replace' ? null : buildDayCronStr(s),
			date: null,
			sunBehavior: {
				sunState: sol.event,
				timeDirection: sol.dir,
				time: (sol.offsetH * 60 + sol.offsetM) * 60000
			},
			after: undefined
		};
	}
	return {
		pattern: buildCronStr(s),
		date: null,
		sunBehavior: undefined,
		after: undefined
	};
}

// DTO cron -> état de l'interface (initialisation depuis les données).
function dtoToState(cron: CronDto | undefined | null): CronState {
	const s: CronState = JSON.parse(JSON.stringify(initialState));
	// Pas figé au chargement du module.
	s.oneTime.date = Date.now();
	if (!cron) return s;
	if (cron.pattern) {
		applyCronString(s, cron.pattern);
		// Ouvre l'onglet du champ qui porte la récurrence (ex. « */10 » en
		// secondes, « */5 » en minutes) plutôt que Minutes par défaut.
		const significant = ORDER.find(k => {
			const f = s.fields[k];
			return (
				f.mode === 'step' ||
				f.mode === 'range' ||
				f.mode === 'free' ||
				(f.mode === 'list' && f.list.length > 1)
			);
		});
		if (significant) s.tab = significant;
	}
	if (cron.sunBehavior) {
		s.solar.enabled = true;
		s.solar.mode = cron.pattern ? 'combine' : 'replace';
		s.solar.event = cron.sunBehavior.sunState === 'SUNRISE' ? 'SUNRISE' : 'SUNSET';
		s.solar.dir = cron.sunBehavior.timeDirection === 'AFTER' ? 'AFTER' : 'BEFORE';
		const totalMin = Math.round((cron.sunBehavior.time || 0) / 60000);
		s.solar.offsetH = Math.floor(totalMin / 60);
		s.solar.offsetM = totalMin % 60;
	} else if (cron.date != null && !cron.pattern) {
		s.oneTime.enabled = true;
		s.oneTime.date = toEpoch(cron.date) ?? Date.now();
	}
	return s;
}

// Mois et jour de la semaine : sans libellé de champ — « tous les Lun, Jeu »
// pour une liste, « de Jan à Juil » pour un intervalle.
const UNPREFIXED: FieldKey[] = ['month', 'dow'];

function describeField(s: CronState, key: FieldKey): string | null {
	const f = s.fields[key];
	if (f.mode === 'every') return null;
	if (UNPREFIXED.includes(key) && f.mode === 'list')
		return i18n.t('cycle:cron.summaryList', {
			list: f.list
				.slice()
				.sort((a, b) => a - b)
				.map(v => fullNameOf(key, v))
				.join(', ')
		});
	if (UNPREFIXED.includes(key) && f.mode === 'range')
		return i18n.t('cycle:cron.summaryRange', {
			from: fullNameOf(key, f.from),
			to: fullNameOf(key, f.to)
		});
	if (f.mode === 'free') return TABLABEL[key] + ' ' + f.free;
	if (f.mode === 'list')
		return (
			TABLABEL[key] +
			' ' +
			f.list
				.slice()
				.sort((a, b) => a - b)
				.map(v => nameOf(key, v))
				.join(',')
		);
	if (f.mode === 'range')
		return (
			TABLABEL[key] +
			' ' +
			i18n.t('cycle:cron.rangeText', {
				from: nameOf(key, f.from),
				to: nameOf(key, f.to)
			})
		);
	// Pas : « tous les 2 mois », « toutes les 15 minutes », suivi de
	// l'intervalle éventuel (« de janvier à juillet »).
	if (f.mode === 'step') {
		const every = i18n.t(`cycle:cron.summaryStep.${key}`, {count: f.step});
		if (f.stepBase !== 'range') return every;
		return (
			every +
			' ' +
			i18n.t('cycle:cron.summaryRange', {
				from: fullNameOf(key, f.from),
				to: fullNameOf(key, f.to)
			})
		);
	}
	return null;
}

// Au-delà, la liste des heures serait illisible : on garde le détail par champ.
const MAX_SUMMARY_TIMES = 6;

// Seconde / minute / heure en valeurs fixes (mode liste) : rassemblées en
// heures « 08:30 » (« 08:30:15 » si une seconde n'est pas 0). null sinon.
function timesText(s: CronState): string | null {
	const lists = (['hour', 'min', 'sec'] as FieldKey[]).map(k => {
		const f = s.fields[k];
		return f.mode === 'list' && f.list.length
			? f.list.slice().sort((a, b) => a - b)
			: null;
	});
	const [hours, mins, secs] = lists;
	if (!hours || !mins || !secs) return null;
	if (hours.length * mins.length * secs.length > MAX_SUMMARY_TIMES) return null;
	const withSec = secs.some(v => v !== 0);
	const pad = (v: number) => String(v).padStart(2, '0');
	const times: string[] = [];
	hours.forEach(h =>
		mins.forEach(m =>
			secs.forEach(sec =>
				times.push(
					`${pad(h)}:${pad(m)}` + (withSec ? `:${pad(sec)}` : '')
				)
			)
		)
	);
	return i18n.t('cycle:cron.atTimes', {times: times.join(', ')});
}

// Ordre de lecture de l'explication : mois, jours, puis heure.
const SUMMARY_DAY_ORDER: FieldKey[] = ['month', 'dom', 'dow'];
const SUMMARY_TIME_ORDER: FieldKey[] = ['hour', 'min', 'sec'];

function summaryText(s: CronState): string {
	const days = SUMMARY_DAY_ORDER.map(k => describeField(s, k));
	const time = timesText(s);
	const timeParts = time ? [time] : SUMMARY_TIME_ORDER.map(k => describeField(s, k));
	const parts = [...days, ...timeParts].filter(Boolean);
	return parts.length ? parts.join(' - ') : i18n.t('cycle:cron.everyUnit');
}

function daySummaryText(s: CronState): string {
	const parts = SUMMARY_DAY_ORDER.map(k => describeField(s, k)).filter(Boolean);
	return parts.length ? parts.join(' - ') : i18n.t('cycle:cron.everyDay');
}

// --- Calcul des prochaines exécutions cron ---------------------------------
function makeMatcher(str: string, lo: number, hi: number): (n: number) => boolean {
	const parts = str.split(',');
	const preds = parts.map(part => {
		let step = 1;
		let base = part;
		if (part.indexOf('/') !== -1) {
			const sp = part.split('/');
			base = sp[0];
			step = parseInt(sp[1], 10) || 1;
		}
		let range: [number, number];
		if (base === '*') {
			range = [lo, hi];
		} else if (base.indexOf('-') !== -1) {
			const rp = base.split('-').map(Number);
			range = [rp[0], rp[1]];
		} else {
			const v = Number(base);
			range = [v, v];
			step = 1;
		}
		return (n: number) => {
			if (n < range[0] || n > range[1]) return false;
			return (n - range[0]) % step === 0;
		};
	});
	return (n: number) => preds.some(p => p(n));
}

// Les calculs avancent en « heure murale de la box » : une Date dont les
// champs UTC (getUTCHours…) portent l'heure locale de la box. Seuls les
// résultats sont convertis en instants, via `zonedToEpoch` : quelques appels
// Intl au lieu d'un par minute parcourue.
function boxWallNow(tz: string): Date {
	const w = wallClockIn(tz, Date.now());
	return new Date(Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute));
}

function wallToInstant(tz: string, wall: Date): Date {
	return new Date(
		zonedToEpoch(tz, {
			year: wall.getUTCFullYear(),
			month: wall.getUTCMonth() + 1,
			day: wall.getUTCDate(),
			hour: wall.getUTCHours(),
			minute: wall.getUTCMinutes()
		})
	);
}

function nextRuns(s: CronState, n: number, tz: string): Date[] {
	const domStr = fieldString(s, 'dom');
	const dowStr = fieldString(s, 'dow');
	const monStr = fieldString(s, 'month');
	const hrStr = fieldString(s, 'hour');
	const minStr = fieldString(s, 'min');
	const domEvery = s.fields.dom.mode === 'every';
	const dowEvery = s.fields.dow.mode === 'every';
	const domM = makeMatcher(domStr, 1, 31);
	const dowM = makeMatcher(dowStr, 0, 6);
	const monM = makeMatcher(monStr, 1, 12);
	const hrM = makeMatcher(hrStr, 0, 23);
	const minM = makeMatcher(minStr, 0, 59);
	const d = boxWallNow(tz);
	d.setUTCMinutes(d.getUTCMinutes() + 1);
	const results: Date[] = [];
	let iter = 0;
	while (results.length < n && iter < 300000) {
		iter++;
		const month = d.getUTCMonth() + 1;
		const dom = d.getUTCDate();
		const dow = d.getUTCDay();
		const hour = d.getUTCHours();
		const minute = d.getUTCMinutes();
		let dayOk;
		if (domEvery && dowEvery) dayOk = true;
		else if (domEvery) dayOk = dowM(dow);
		else if (dowEvery) dayOk = domM(dom);
		else dayOk = domM(dom) || dowM(dow);
		if (monM(month) && dayOk && hrM(hour) && minM(minute)) {
			const t = wallToInstant(tz, d);
			// Heure de recul : deux heures murales tombent sur le même instant.
			if (!results.some(r => r.getTime() === t.getTime())) results.push(t);
		}
		d.setUTCMinutes(d.getUTCMinutes() + 1);
	}
	return results;
}

// --- Calcul solaire (algorithme du mockup) ---------------------------------
// `date` : jour en heure murale de la box (champs UTC).
function sunTimeUT(
	date: Date,
	lat: number,
	lon: number,
	isSunrise: boolean
): number | null {
	const rad = Math.PI / 180;
	const start = Date.UTC(date.getUTCFullYear(), 0, 0);
	const n = Math.floor((date.getTime() - start) / 86400000);
	const lngHour = lon / 15;
	const t = isSunrise ? n + (6 - lngHour) / 24 : n + (18 - lngHour) / 24;
	const M = 0.9856 * t - 3.289;
	let L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634;
	L = (L + 360) % 360;
	let RA = (1 / rad) * Math.atan(0.91764 * Math.tan(L * rad));
	RA = (RA + 360) % 360;
	const Lq = Math.floor(L / 90) * 90;
	const RAq = Math.floor(RA / 90) * 90;
	RA = (RA + (Lq - RAq)) / 15;
	const sinDec = 0.39782 * Math.sin(L * rad);
	const cosDec = Math.cos(Math.asin(sinDec));
	const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
	if (cosH > 1 || cosH < -1) return null;
	let H = isSunrise ? 360 - (1 / rad) * Math.acos(cosH) : (1 / rad) * Math.acos(cosH);
	H = H / 15;
	const T = H + RA - 0.06571 * t - 6.622;
	let UT = T - lngHour;
	UT = (UT + 24) % 24;
	return UT;
}

function solarEventTime(s: CronState, date: Date): Date | null {
	// L'heure UT du soleil donne directement un instant : pas de fuseau ici.
	const sol = s.solar;
	const UT = sunTimeUT(date, sol.lat, sol.lon, sol.event === 'SUNRISE');
	if (UT === null) return null;
	let hours = Math.floor(UT);
	let minutes = Math.round((UT - hours) * 60);
	if (minutes === 60) {
		minutes = 0;
		hours = (hours + 1) % 24;
	}
	const d = new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes)
	);
	const offsetMin = (sol.offsetH * 60 + sol.offsetM) * (sol.dir === 'BEFORE' ? -1 : 1);
	return new Date(d.getTime() + offsetMin * 60000);
}

// Jour n° `i` à partir d'aujourd'hui, en heure murale de la box.
function boxDay(tz: string, i: number): Date {
	const w = wallClockIn(tz, Date.now());
	return new Date(Date.UTC(w.year, w.month - 1, w.day + i));
}

function nextSolarRuns(s: CronState, n: number, tz: string): Date[] {
	const results: Date[] = [];
	const now = new Date();
	for (let i = 0; i < 400 && results.length < n; i++) {
		const day = boxDay(tz, i);
		const t = solarEventTime(s, day);
		if (t && t.getTime() > now.getTime()) results.push(t);
	}
	return results;
}

function nextCombinedRuns(s: CronState, n: number, tz: string): Date[] {
	const domStr = fieldString(s, 'dom');
	const dowStr = fieldString(s, 'dow');
	const monStr = fieldString(s, 'month');
	const domEvery = s.fields.dom.mode === 'every';
	const dowEvery = s.fields.dow.mode === 'every';
	const domM = makeMatcher(domStr, 1, 31);
	const dowM = makeMatcher(dowStr, 0, 6);
	const monM = makeMatcher(monStr, 1, 12);
	const results: Date[] = [];
	const now = new Date();
	for (let i = 0; i < 400 && results.length < n; i++) {
		const day = boxDay(tz, i);
		const month = day.getUTCMonth() + 1;
		const dom = day.getUTCDate();
		const dow = day.getUTCDay();
		let dayOk;
		if (domEvery && dowEvery) dayOk = true;
		else if (domEvery) dayOk = dowM(dow);
		else if (dowEvery) dayOk = domM(dom);
		else dayOk = domM(dom) || dowM(dow);
		if (monM(month) && dayOk) {
			const t = solarEventTime(s, day);
			if (t && t.getTime() > now.getTime()) results.push(t);
		}
	}
	return results;
}

// Décalage « 1 h 30 min » ; vide sans décalage.
function solarOffsetLabel(s: CronState): string {
	const parts: string[] = [];
	if (s.solar.offsetH > 0) parts.push(s.solar.offsetH + ' h');
	if (s.solar.offsetM > 0) parts.push(s.solar.offsetM + ' min');
	return parts.join(' ');
}

function solarEventLabel(s: CronState): string {
	return s.solar.event === 'SUNRISE'
		? i18n.t('cycle:cron.solar.sunriseLower')
		: i18n.t('cycle:cron.solar.sunsetLower');
}

// Expression solaire : « coucher du soleil », « 30 min avant le coucher du
// soleil » (décalage d'abord, puis le sens et l'événement).
function solarDescription(s: CronState): string | null {
	if (!s.solar.enabled) return null;
	const event = solarEventLabel(s);
	const offset = solarOffsetLabel(s);
	if (!offset) return event;
	return i18n.t(
		s.solar.dir === 'BEFORE'
			? 'cycle:cron.solar.offsetBefore'
			: 'cycle:cron.solar.offsetAfter',
		{offset, event}
	);
}

// Même chose dans une phrase (résumés) : « au coucher du soleil » sans
// décalage, « 30 min avant le coucher du soleil » sinon.
function solarPhrase(s: CronState): string {
	if (!solarOffsetLabel(s)) {
		return i18n.t('cycle:cron.solar.atEvent', {event: solarEventLabel(s)});
	}
	return solarDescription(s) ?? '';
}

const MODES: Exclude<FieldMode, 'free'>[] = ['every', 'list', 'range', 'step'];

// Les intervalles (du / au) se saisissent dans une popup à deux roues,
// présélectionnée sur tout l'intervalle du champ (min → max).
// Libellé complet (mois / jours de semaine en toutes lettres, heures, minutes
// et secondes sur deux chiffres) pour le champ et les roues.
function wheelLabel(key: FieldKey, v: number): string {
	if (key === 'dom') return String(v);
	if (key !== 'month' && key !== 'dow') return String(v).padStart(2, '0');
	const names = toNameList(
		i18n.t(key === 'month' ? 'cycle:cron.monthsLong' : 'cycle:cron.weekdaysLong', {
			returnObjects: true
		})
	);
	return names[key === 'month' ? v - 1 : v] ?? String(v);
}
// Jours (du mois / de semaine) : « du … au … » ; autres champs : « de … à … ».
// Le libellé du champ et ceux des roues suivent la même tournure.
const isDayRange = (key: FieldKey) => key === 'dom' || key === 'dow';
function wheelOptions(key: FieldKey): {label: string; value: number}[] {
	const cfg = FIELDCFG[key];
	return Array.from({length: cfg.hi - cfg.lo + 1}, (_, i) => {
		const v = cfg.lo + i;
		return {label: wheelLabel(key, v), value: v};
	});
}

// --- Petits composants d'UI ------------------------------------------------
function Chip({
	label,
	active,
	onPress,
	style
}: {
	label: string;
	active?: boolean;
	onPress: () => void;
	style?: any;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[styles.chip, active ? styles.chipActive : styles.chipIdle, style]}>
			<Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{label}</Text>
		</TouchableOpacity>
	);
}

function NumInput({
	value,
	onChange,
	width = 60,
	invalid = false
}: {
	value: number;
	onChange: (n: number) => void;
	width?: number;
	invalid?: boolean;
}) {
	// Texte local : pendant la saisie le champ peut être vidé (pour taper « 10 »
	// à la place de « 5 ») sans être aussitôt réécrit par la valeur numérique.
	// Seuls les nombres saisis remontent ; au blur, le texte reprend la valeur.
	const [txt, setTxt] = React.useState(String(value));
	const focused = React.useRef(false);
	React.useEffect(() => {
		if (!focused.current) setTxt(String(value));
	}, [value]);
	return (
		<TextInput
			keyboardType="number-pad"
			value={txt}
			onFocus={() => (focused.current = true)}
			onBlur={() => {
				focused.current = false;
				setTxt(String(value));
			}}
			onChangeText={t => {
				const digits = t.replace(/[^0-9]/g, '');
				setTxt(digits);
				if (digits !== '') onChange(parseInt(digits, 10));
			}}
			style={[
				styles.numInput,
				{width},
				(invalid || txt === '') && styles.inputInvalid
			]}
		/>
	);
}

// Saisie d'une liste de nombres (ex: 0,15,30,45) validée sur les bornes du
// champ. Remonte uniquement les valeurs valides et signale les valeurs hors
// bornes. Monté par onglet (key) pour repartir du texte du champ courant.
function ListNumInput({
	initial,
	lo,
	hi,
	onChangeList
}: {
	initial: string;
	lo: number;
	hi: number;
	onChangeList: (list: number[]) => void;
}) {
	const [txt, setTxt] = React.useState(initial);
	// Reflète les changements externes (ex: édition de l'expression cron) tant
	// que l'utilisateur n'est pas en train de saisir dans ce champ.
	const focused = React.useRef(false);
	React.useEffect(() => {
		if (!focused.current) setTxt(initial);
	}, [initial]);
	const tokens = txt
		.split(',')
		.map(s => s.trim())
		.filter(s => s.length > 0);
	const bad = tokens.filter(t => {
		const n = Number(t);
		return !/^\d+$/.test(t) || n < lo || n > hi;
	});
	const invalid = bad.length > 0;
	return (
		<>
			<TextInput
				keyboardType="numbers-and-punctuation"
				placeholder={i18n.t('cycle:cron.listExample')}
				placeholderTextColor={placeholderColor}
				value={txt}
				onFocus={() => (focused.current = true)}
				onBlur={() => (focused.current = false)}
				onChangeText={t => {
					setTxt(t);
					const valid = t
						.split(',')
						.map(x => parseInt(x.trim(), 10))
						.filter(x => !isNaN(x) && x >= lo && x <= hi);
					onChangeList(valid);
				}}
				style={[styles.textInput, invalid && styles.inputInvalid]}
			/>
			{invalid ? (
				<Text style={styles.errorTxt}>
					{i18n.t('cycle:cron.listInvalid', {lo, hi})}
				</Text>
			) : (
				<Text style={styles.hint}>
					{i18n.t('cycle:cron.listHint', {lo, hi})}
				</Text>
			)}
		</>
	);
}

// --- Composant principal ---------------------------------------------------
export function NewSchedulingSection(props: any) {
	// Fuseau et position de la box : les crons s'exécutent en heure de la box.
	const tz: string = useSelector(selectBoxTimeZone);
	const coordinates = useSelector(selectBoxCoordinates);
	const lat = coordinates?.latitude ?? DEFAULT_LAT;
	const lon = coordinates?.longitude ?? DEFAULT_LON;

	// Initialisation depuis le modèle `schedule.cron` (une seule fois).
	const initial = React.useMemo(
		() => dtoToState(props.cron ?? props.scheduleData?.cron),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);
	const [state, setState] = React.useState<CronState>(initial);

	// Référence sur le schedule parent pour merger le staging sans écraser les
	// autres sections.
	const parentRef = React.useRef(props.scheduleData);
	parentRef.current = props.scheduleData;

	// Applique une mutation sur une copie profonde (données sérialisables).
	const patch = (fn: (draft: CronState) => void) =>
		setState(prev => {
			const next: CronState = JSON.parse(JSON.stringify(prev));
			fn(next);
			return next;
		});

	// Stage le DTO dans redux uniquement quand il change réellement (jamais au
	// montage, ni pour un simple changement d'onglet qui laisse le DTO identique).
	const lastDtoRef = React.useRef(JSON.stringify(mapToDto(initial)));
	const firstRun = React.useRef(true);
	React.useEffect(() => {
		if (firstRun.current) {
			firstRun.current = false;
			return;
		}
		const dto = mapToDto(state);
		const dtoStr = JSON.stringify(dto);
		if (dtoStr !== lastDtoRef.current) {
			lastDtoRef.current = dtoStr;
			if (props.onChange) {
				props.onChange(dto);
				return;
			}
			props.updateSchedule?.({
				...parentRef.current,
				cron: dto,
				isModified: true
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state]);

	const stageFlag = (key: 'isPaused' | 'shouldConfirmation', v: boolean) =>
		props.updateSchedule?.({...parentRef.current, [key]: v, isModified: true});

	const oneTimeEnabled = state.oneTime.enabled;
	const [pickerVisible, setPickerVisible] = React.useState(false);
	const [rangeModalOpen, setRangeModalOpen] = React.useState(false);
	// Popin de configuration (`editInModal`), ouverte par le bouton planification.
	const [configOpen, setConfigOpen] = React.useState(false);
	const combineMode =
		!oneTimeEnabled && state.solar.enabled && state.solar.mode === 'combine';
	const replaceMode =
		!oneTimeEnabled && state.solar.enabled && state.solar.mode === 'replace';
	const tabKeys = combineMode ? DAYORDER : ORDER;
	const activeTab = tabKeys.includes(state.tab) ? state.tab : tabKeys[0];

	// Onglets : une seule ligne en paysage, deux lignes équilibrées en portrait.
	const {width, height} = useWindowDimensions();
	const isLandscape = width > height;
	const tabRows: FieldKey[][] = isLandscape
		? [tabKeys]
		: [
				tabKeys.slice(0, Math.ceil(tabKeys.length / 2)),
				tabKeys.slice(Math.ceil(tabKeys.length / 2))
		  ].filter(r => r.length > 0);

	// Expression cron (inchangée par le solaire), résumé, expression du
	// déclencheur solaire (séparée) et prochaines exécutions.
	const {displayStr, summary, solarStr, runs} = React.useMemo(() => {
		// Date ponctuelle : l'expression est le cron dérivé de la date choisie.
		if (state.oneTime.enabled) {
			const ts = state.oneTime.date;
			return {
				displayStr: oneTimeCronStr(ts, tz),
				summary: i18n.t('cycle:cron.oneTimeSummary', {
					date: formatOneTime(ts, tz)
				}),
				solarStr: null,
				runs: ts > Date.now() ? [new Date(ts)] : []
			};
		}
		// Position solaire : celle de la box (hors DTO, n'affecte pas le staging).
		const calc: CronState = {...state, solar: {...state.solar, lat, lon}};
		const sol = calc.solar;
		const combine = sol.enabled && sol.mode === 'combine';
		// En mode « combiner », l'expression ne porte que jour/mois/semaine ;
		// sinon c'est l'expression cron complète.
		const dStr = combine ? buildDayCronStr(state) : buildCronStr(state);
		const sum = combine ? daySummaryText(state) : summaryText(state);
		const solStr = sol.enabled ? solarDescription(state) : null;
		let r: Date[];
		if (sol.enabled && sol.mode === 'replace') r = nextSolarRuns(calc, RUNS_PREVIEW, tz);
		else if (combine) r = nextCombinedRuns(calc, RUNS_PREVIEW, tz);
		else r = nextRuns(calc, RUNS_PREVIEW, tz);
		return {displayStr: dStr, summary: sum, solarStr: solStr, runs: r};
	}, [state, tz, lat, lon]);


	// Champ Expression éditable (mode cron pur). Texte local synchronisé sur
	// l'expression générée quand l'utilisateur ne l'édite pas ; éditer le texte
	// repopule les champs de l'interface.
	const [exprText, setExprText] = React.useState('');
	const exprFocused = React.useRef(false);
	React.useEffect(() => {
		if (!exprFocused.current) setExprText(displayStr);
	}, [displayStr]);
	const onExprChange = (t: string) => {
		setExprText(t);
		patch(n =>
			combineMode ? applyDayCronString(n, t) : applyCronString(n, t)
		);
	};

	const cfg = FIELDCFG[activeTab];
	const f = state.fields[activeTab];

	// Validation selon les bornes du champ courant (lo/hi).
	const inBounds = (v: number) => v >= cfg.lo && v <= cfg.hi;
	const fromInvalid = !inBounds(f.from);
	const toInvalid = !inBounds(f.to);
	const orderInvalid = !fromInvalid && !toInvalid && f.from > f.to;
	const rangeError = fromInvalid || toInvalid
		? i18n.t('cycle:cron.between', {lo: cfg.lo, hi: cfg.hi})
		: orderInvalid
		? i18n.t('cycle:cron.orderInvalid')
		: null;
	const stepInvalid = f.step < 1 || f.step > cfg.hi;
	const stepError = stepInvalid
		? i18n.t('cycle:cron.stepInvalid', {hi: cfg.hi})
		: null;

	// Champ « du … au … » : ouvre la popup à deux roues.
	const rangeField = (
		<TouchableOpacity
			onPress={() => setRangeModalOpen(true)}
			style={[styles.textInput, styles.rangeField]}>
			<Text style={styles.rangeFieldTxt} numberOfLines={1}>
				{i18n.t(isDayRange(activeTab) ? 'cycle:cron.rangeTextDay' : 'cycle:cron.rangeText', {
					from: wheelLabel(activeTab, f.from),
					to: wheelLabel(activeTab, f.to)
				})}
			</Text>
			<FontAwesomeIcon icon={faPen} size={14} color={C.muted} />
		</TouchableOpacity>
	);

	// Builder (date ponctuelle, champs cron, solaire) : en ligne, ou dans la
	// popin ouverte par le bouton planification du bloc Expression (`editInModal`).
	const builder = (
		<>
			<TimeZoneNotice kind="box" />
			{/* Date ponctuelle : planifie une seule exécution via le datetime picker. */}
			{!props.cronOnly && (
				<View style={styles.switchRow}>
					<Text style={styles.switchLabel}>{i18n.t('cycle:cron.oneTime')}</Text>
					<AppSwitch
						value={oneTimeEnabled}
						onValueChange={v => patch(n => (n.oneTime.enabled = v))}
					/>
				</View>
			)}

			{oneTimeEnabled && (
				<View style={styles.editorCard}>
					<Text style={styles.fieldLabel}>{i18n.t('cycle:cron.dateTime')}</Text>
					<TouchableOpacity
						onPress={() => setPickerVisible(true)}
						style={styles.dateField}>
						<Text style={styles.dateFieldTxt}>
							{formatOneTime(state.oneTime.date, tz)}
						</Text>
					</TouchableOpacity>
					<Text style={styles.hint}>
						{i18n.t('cycle:cron.oneTimeHint')}
					</Text>
				</View>
			)}

			{/* Section cron (masquée en mode "remplacer" ou "date ponctuelle") */}
			{!replaceMode && !oneTimeEnabled && (
				<>
					<View style={styles.tabRows}>
						{tabRows.map((row, ri) => (
							<View key={ri} style={styles.tabRow}>
								{row.map(k => (
									<Chip
										key={k}
										label={TABLABEL[k]}
										active={activeTab === k}
										onPress={() => patch(n => (n.tab = k))}
										style={styles.tabChip}
									/>
								))}
							</View>
						))}
					</View>

					<View style={styles.editorCard}>
						<Text style={styles.fieldLabel}>{cfg.label}</Text>
						{/* Modes en grille 2 x 2, boutons de taille identique ; une
						    ligne incomplète est complétée par des cases vides pour
						    garder l'alignement. */}
						<View style={styles.modeGrid}>
							{[MODES.slice(0, 2), MODES.slice(2)].map((row, r) => (
								<View key={r} style={styles.modeRow}>
									{row.map(m => (
										<Chip
											key={m}
											label={i18n.t(`cycle:cron.mode.${m}`)}
											active={f.mode === m}
											onPress={() =>
												patch(n => {
													const nf = n.fields[activeTab];
													// Passage en intervalle : présélection sur tout l'intervalle (min → max).
													if (m === 'range' && nf.mode !== 'range') {
														nf.from = FIELDCFG[activeTab].lo;
														nf.to = FIELDCFG[activeTab].hi;
													}
													nf.mode = m;
												})
											}
											style={styles.modeChip}
										/>
									))}
									{Array.from({length: 2 - row.length}).map((_, i) => (
										<View key={'pad' + i} style={styles.modeCell} />
									))}
								</View>
							))}
						</View>

						{f.mode === 'every' && (
							<Text style={styles.hint}>{i18n.t('cycle:cron.anyValue')}</Text>
						)}

						{f.mode === 'list' &&
							(cfg.type === 'name' && cfg.names ? (
								<View style={styles.chipsWrap}>
									{cfg.names.map((nm, i) => {
										const v = cfg.base === 0 ? i : i + 1;
										const on = f.list.includes(v);
										return (
											<Chip
												key={nm}
												label={nm}
												active={on}
												onPress={() =>
													patch(n => {
														const list = n.fields[activeTab].list;
														const idx = list.indexOf(v);
														if (idx === -1) list.push(v);
														else list.splice(idx, 1);
													})
												}
											/>
										);
									})}
								</View>
							) : (
								<ListNumInput
									key={activeTab}
									initial={f.list.join(',')}
									lo={cfg.lo}
									hi={cfg.hi}
									onChangeList={list =>
										patch(n => (n.fields[activeTab].list = list))
									}
								/>
							))}

						{f.mode === 'range' && (
							<>
								{rangeField}
								{rangeError && <Text style={styles.errorTxt}>{rangeError}</Text>}
							</>
						)}

						{f.mode === 'step' && (
							<>
								<View style={styles.segRow}>
									<TouchableOpacity
										onPress={() =>
											patch(n => (n.fields[activeTab].stepBase = 'every'))
										}
										style={[
											styles.segBtn,
											f.stepBase === 'every' && styles.segBtnActive
										]}>
										<Text
											style={[
												styles.segTxt,
												f.stepBase === 'every' && styles.segTxtActive
											]}>
											{i18n.t('cycle:cron.from')}
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() =>
											patch(n => {
												const nf = n.fields[activeTab];
												if (nf.stepBase !== 'range') {
													nf.from = FIELDCFG[activeTab].lo;
													nf.to = FIELDCFG[activeTab].hi;
												}
												nf.stepBase = 'range';
											})
										}
										style={[
											styles.segBtn,
											f.stepBase === 'range' && styles.segBtnActive
										]}>
										<Text
											style={[
												styles.segTxt,
												f.stepBase === 'range' && styles.segTxtActive
											]}>
											{i18n.t('cycle:cron.inRange')}
										</Text>
									</TouchableOpacity>
								</View>
								{f.stepBase === 'range' && (
									<>
										{rangeField}
										{rangeError && (
											<Text style={styles.errorTxt}>{rangeError}</Text>
										)}
									</>
								)}
								<View style={styles.inlineRow}>
									<Text style={styles.inlineTxt}>{i18n.t('cycle:cron.every')}</Text>
									<NumInput
										value={f.step}
										invalid={stepInvalid}
										onChange={v => patch(n => (n.fields[activeTab].step = v || 1))}
									/>
									<Text style={styles.inlineTxt}>{i18n.t('cycle:cron.units')}</Text>
								</View>
								{stepError ? (
									<Text style={styles.errorTxt}>{stepError}</Text>
								) : (
									<Text style={styles.hint}>
										{i18n.t('cycle:cron.stepHint', {hi: cfg.hi})}
									</Text>
								)}
							</>
						)}

						{f.mode === 'free' && (
							<>
								<TextInput
									placeholder={i18n.t('cycle:cron.freeExample')}
									placeholderTextColor={placeholderColor}
									defaultValue={f.free}
									autoCapitalize="none"
									onChangeText={t => patch(n => (n.fields[activeTab].free = t))}
									style={styles.textInput}
								/>
								<Text style={styles.hint}>
									{i18n.t('cycle:cron.freeHint')}
								</Text>
							</>
						)}
					</View>
				</>
			)}

			{/* Déclencheur solaire (masqué en mode date ponctuelle) */}
			{!oneTimeEnabled && !props.cronOnly && (
				<View style={styles.switchRow}>
					<Text style={styles.switchLabel}>
						{i18n.t('cycle:cron.solar.add')}
					</Text>
					<AppSwitch
						value={state.solar.enabled}
						onValueChange={v => patch(n => (n.solar.enabled = v))}
					/>
				</View>
			)}

			{!oneTimeEnabled && state.solar.enabled && (
				<View style={styles.editorCard}>
					<Text style={styles.hint}>
						{state.solar.mode === 'replace'
							? i18n.t('cycle:cron.solar.replaceHint')
							: i18n.t('cycle:cron.solar.combineHint')}
					</Text>
					<View style={styles.segRow}>
						<SegBtn
							label={i18n.t('cycle:cron.solar.combine')}
							active={state.solar.mode === 'combine'}
							onPress={() => patch(n => (n.solar.mode = 'combine'))}
						/>
						<SegBtn
							label={i18n.t('cycle:cron.solar.replace')}
							active={state.solar.mode === 'replace'}
							onPress={() => patch(n => (n.solar.mode = 'replace'))}
						/>
					</View>
					<SolarTriggerFields
						value={{
							sunState: state.solar.event,
							timeDirection: state.solar.dir,
							time: (state.solar.offsetH * 60 + state.solar.offsetM) * 60000
						}}
						onChange={p =>
							patch(n => {
								if (p.sunState) n.solar.event = p.sunState;
								if (p.timeDirection) n.solar.dir = p.timeDirection;
								if (p.time !== undefined) {
									const min = Math.round(p.time / 60000);
									n.solar.offsetH = Math.floor(min / 60);
									n.solar.offsetM = min % 60;
								}
							})
						}
					/>
				</View>
			)}
		</>
	);

	// Pause / confirmation : propres au schedule (absents en réutilisation
	// hors schedule, ex. sensor). En `editInModal`, à la fin du bloc Expression.
	const flags = !props.onChange && (
		<WarningBox
			hideIcon
			style={props.editInModal ? styles.flagsBoxFirst : styles.flagsBox}>
			<View style={styles.flagRow}>
				<Text style={styles.switchLabel}>
					{i18n.t('cycle:schedules.enabled')}
				</Text>
				{/* « Activé » = inverse de `isPaused` (absent = activé). */}
				<AppSwitch
					value={!props.scheduleData?.isPaused}
					onValueChange={v => stageFlag('isPaused', !v)}
				/>
			</View>
			<View style={styles.flagRow}>
				<Text style={styles.switchLabel}>
					{i18n.t('cycle:schedules.needConfirmation')}
				</Text>
				<AppSwitch
					value={!!props.scheduleData?.shouldConfirmation}
					onValueChange={v => stageFlag('shouldConfirmation', v)}
				/>
			</View>
		</WarningBox>
	);

	// Sélecteurs (date ponctuelle, intervalle) : rendus dans la popin quand le
	// builder y est, pour s'ouvrir au-dessus d'elle.
	const pickers = (
		<>
			{/* Sélecteur de date ponctuelle (même picker que la section Execution). */}
			<DateTimePickerModal
				isVisible={pickerVisible}
				mode="datetime"
				display="inline"
				themeVariant="light"
				isDarkModeEnabled={false}
				accentColor="#32404e"
				buttonTextColorIOS="#32404e"
				date={toPickerDate(tz, state.oneTime.date)}
				minimumDate={toPickerDate(tz, Date.now())}
				onConfirm={d => {
					setPickerVisible(false);
					const ts = fromPickerDate(tz, d);
					patch(n => (n.oneTime.date = ts));
				}}
				onCancel={() => setPickerVisible(false)}
				{...pickerLocaleProps('datetime')}
			/>
			<ModalRangePicker
				isOpen={rangeModalOpen}
				title={cfg.label}
				message={i18n.t('cycle:cron.rangeModal.message')}
				fromLabel={i18n.t(
					isDayRange(activeTab) ? 'cycle:cron.rangeModal.fromDay' : 'cycle:cron.rangeModal.from'
				)}
				toLabel={i18n.t(
					isDayRange(activeTab) ? 'cycle:cron.rangeModal.toDay' : 'cycle:cron.rangeModal.to'
				)}
				options={wheelOptions(activeTab)}
				from={f.from}
				to={f.to}
				onClose={() => setRangeModalOpen(false)}
				onConfirm={(from, to) =>
					patch(n => {
						n.fields[activeTab].from = from;
						n.fields[activeTab].to = to;
					})
				}
			/>
		</>
	);

	// `editInModal` : bouton outline (icône planification) à côté de l'expression, qui
	// ouvre la popin de configuration.
	const editBtn = props.editInModal ? (
		<OutlineButton
			icon={faCalendarDays}
			color={C.text}
			accessibilityLabel={i18n.t('cycle:cron.edit')}
			onPress={() => setConfigOpen(true)}
			style={styles.editBtn}
		/>
	) : null;

	// Expression + prochaines exécutions. En `editInModal`, le bloc Expression
	// porte le bouton de configuration et, à la fin, pause / confirmation.
	const preview = !props.hidePreview && (
		<>
			{/* Expression */}
			<View style={styles.outCard}>
				{oneTimeEnabled ? (
					<>
						<Text style={styles.sectionLabel}>{i18n.t('cycle:cron.expression')}</Text>
						<View style={[styles.exprRow, styles.exprRowSpaced]}>
							<Text
								selectable
								style={[styles.expression, styles.exprFlex, styles.noMargin]}>
								{displayStr}
							</Text>
							{editBtn}
						</View>
						<InfoBox style={styles.summaryBox}>
							<Text style={[styles.summary, styles.infoText]}>{summary}</Text>
						</InfoBox>
					</>
				) : (
					/* En mode « remplacer » le cron est ignoré : pas d'expression cron. */
					!replaceMode && (
						<>
							<Text style={styles.sectionLabel}>{i18n.t('cycle:cron.expression')}</Text>
							<View style={styles.exprRow}>
								<TextInput
									value={exprText}
									onChangeText={onExprChange}
									onFocus={() => (exprFocused.current = true)}
									onBlur={() => {
										exprFocused.current = false;
										setExprText(displayStr);
									}}
									autoCapitalize="none"
									autoCorrect={false}
									placeholder={combineMode ? '* * *' : '* * * * * *'}
									placeholderTextColor={placeholderColor}
									style={[styles.expressionInput, styles.exprFlex]}
								/>
								{editBtn}
							</View>
							{/* Avec le déclencheur solaire (combiner), l'explication de
							    la cron passe dans le bloc solaire. */}
							{combineMode ? null : (
								<InfoBox style={styles.summaryBox}>
									<Text style={[styles.summary, styles.infoText]}>
										{summary}
									</Text>
								</InfoBox>
							)}
						</>
					)
				)}

				{/* Déclencheur solaire (séparé, n'altère pas le cron) : tout le bloc
				    dans une InfoBox, sans titre — expression solaire et explication (cron
				    des jours en « combiner », remplacement du cron en « remplacer »). */}
				{solarStr && (
					<InfoBox style={replaceMode ? undefined : styles.solarInfoBox}>
						<View style={styles.exprRow}>
							<Text
								selectable
								style={[styles.solarExpr, styles.infoText, styles.exprFlex]}>
								{solarStr}
							</Text>
							{/* Remplacer : pas d'expression cron, le bouton suit le solaire. */}
							{replaceMode ? editBtn : null}
						</View>
						<Text style={[styles.summary, styles.infoText]}>
							{replaceMode
								? i18n.t('cycle:cron.solar.replaceSummary', {
										solar: solarPhrase(state)
								  })
								: summary}
						</Text>
					</InfoBox>
				)}

				{/* Pause / confirmation après l'explication de l'expression. */}
				{props.editInModal ? flags : null}
			</View>

			{/* Prochaines exécutions */}
			{!props.hideRuns && (
				<View style={styles.outCard}>
					<Text style={styles.sectionLabel}>{i18n.t('cycle:cron.nextRuns')}</Text>
					{runs.length === 0 ? (
						<Text style={styles.hint}>
							{i18n.t('cycle:cron.noRuns')}
						</Text>
					) : (
						runs.map((d, i) => (
							<Text key={i} style={styles.runRow}>
								{d.toLocaleDateString(i18n.language, {
									timeZone: tz,
									weekday: 'short',
									day: '2-digit',
									month: 'short'
								})}
								{', '}
								{d.toLocaleTimeString(i18n.language, {
									timeZone: tz,
									hour: '2-digit',
									minute: '2-digit'
								})}
							</Text>
						))
					)}
				</View>
			)}
		</>
	);

	if (props.editInModal) {
		return (
			<View style={styles.wrap}>
				{preview}
				<ModalCard
					isOpen={configOpen}
					onClose={() => setConfigOpen(false)}
					title={i18n.t('cycle:cron.configTitle')}
					style={styles.modalSize}>
					<ScrollView
						style={styles.modalScroll}
						keyboardShouldPersistTaps="handled">
						{builder}
					</ScrollView>
					<OutlineButton
						label={i18n.t('cycle:cron.done')}
						icon={faCheck}
						onPress={() => setConfigOpen(false)}
					/>
					{pickers}
				</ModalCard>
			</View>
		);
	}

	return (
		<View style={styles.wrap}>
			{builder}

			{preview}

			{flags}

			{pickers}
		</View>
	);
}

function SegBtn({
	label,
	active,
	onPress
}: {
	label: string;
	active: boolean;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[styles.segBtn, active && styles.segBtnActive]}>
			<Text style={[styles.segTxt, active && styles.segTxtActive]}>{label}</Text>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	// Contenu calé sur la verticale de l'icône de l'en-tête (marginLeft: 10 du
	// MenuAccordion) pour que tout s'aligne sous l'icône de la section.
	wrap: {paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 14},
	// Libellés au format « Décalage » (déclencheur solaire) : gris, 13, semi-gras.
	sectionLabel: {
		...fieldLabelText,
		marginBottom: 8,
		marginTop: 4
	},
	tabRows: {gap: 8, marginTop: 2},
	tabRow: {flexDirection: 'row', gap: 8},
	tabChip: {
		flex: 1,
		paddingHorizontal: 8,
		paddingVertical: 9,
		borderRadius: 16,
		alignItems: 'center'
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 14,
		marginBottom: 6
	},
	flagsBox: {
		marginTop: 14
	},
	// En tête du bloc Expression (`editInModal`).
	// Dans le bloc Expression (`editInModal`), après l'explication.
	flagsBoxFirst: {
		marginTop: 12
	},
	// Expression + bouton de configuration sur une ligne.
	exprRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
	exprFlex: {flex: 1},
	// La marge de l'expression passe à la ligne (alignement avec le bouton).
	exprRowSpaced: {marginBottom: 10},
	noMargin: {marginBottom: 0},
	// OutlineButton icône seule, carré à la hauteur du champ (ELEMENT_HEIGHT) ;
	// on neutralise sa marge / son centrage par défaut.
	editBtn: {
		width: ELEMENT_HEIGHT,
		marginTop: 0,
		alignSelf: 'auto',
		justifyContent: 'center',
		paddingHorizontal: 0
	},
	modalSize: {width: '90%', maxHeight: '85%'},
	// Se contracte dans la carte pour que le builder défile.
	modalScroll: {flexShrink: 1},
	flagRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginVertical: 4
	},
	switchLabel: InputStyle.switchLabel,
	// Même style que la carte englobant la liste des séquences : fond blanc,
	// coins arrondis, ombre douce (pas de bordure).
	editorCard: {
		backgroundColor: C.surface,
		borderRadius: 12,
		padding: 14,
		marginTop: 10,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	fieldLabel: {...fieldLabelText, marginBottom: 10},
	chipsWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1
	},
	chipIdle: {backgroundColor: C.surface, borderColor: C.border},
	modeGrid: {gap: 8, marginBottom: 4},
	modeRow: {flexDirection: 'row', gap: 8},
	modeCell: {flex: 1},
	modeChip: {flex: 1, alignItems: 'center', paddingHorizontal: 6},
	chipActive: {backgroundColor: C.chipActiveBg, borderColor: C.chipActiveBorder},
	chipTxt: {fontSize: 13, color: C.text, fontWeight: '600'},
	chipTxtActive: {color: '#ffffff', fontWeight: '700'},
	hint: {fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 17},
	errorTxt: {
		fontSize: 12,
		color: '#E53E3E',
		fontWeight: '600',
		marginTop: 8,
		lineHeight: 17
	},
	inputInvalid: {borderColor: '#FC8181', borderWidth: 2},
	dateField: {
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		height: ELEMENT_HEIGHT,
		justifyContent: 'center'
	},
	dateFieldTxt: inputText,
	textInput: {
		marginTop: 10,
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		height: ELEMENT_HEIGHT,
		...inputText
	},
	numInput: {
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		height: ELEMENT_HEIGHT,
		textAlign: 'center',
		...inputText
	},
	rangeField: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8
	},
	rangeFieldTxt: {flex: 1, color: C.text, fontSize: 15, fontWeight: 'bold'},
	segRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
	segBtn: {
		flex: 1,
		paddingVertical: 10,
		paddingHorizontal: 6,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.surface,
		alignItems: 'center'
	},
	segBtnActive: {backgroundColor: C.chipActiveBg, borderColor: C.chipActiveBorder},
	segTxt: {fontSize: 13, color: C.text, textAlign: 'center', fontWeight: '600'},
	segTxtActive: {color: '#ffffff', fontWeight: '700'},
	inlineRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6},
	inlineTxt: {fontSize: 14, color: C.text, fontWeight: '600'},
	inlineMuted: {fontSize: 14, color: C.muted},
	// Blocs Expression et Prochaines exécutions : posés directement dans la
	// section (pas de carte imbriquée), séparés par un simple espacement.
	outCard: {
		marginTop: 14
	},
	expression: {
		...inputText,
		marginBottom: 10
	},
	expressionInput: {
		...inputText,
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		height: ELEMENT_HEIGHT
	},
	summary: {fontSize: 13, color: C.secondary, lineHeight: 18},
	// Bloc solaire (InfoBox) sous l'expression cron en « combiner ».
	solarInfoBox: {marginTop: 12},
	// Explication de la cron (sans solaire) dans une InfoBox, sous l'expression.
	summaryBox: {marginTop: 8},
	infoText: {color: INFO_COLORS.text},
	solarExpr: {
		fontSize: 15,
		fontWeight: '700',
		color: C.text,
		marginBottom: 8
	},
	runRow: {
		fontSize: 14,
		color: C.secondary,
		fontWeight: '600',
		paddingVertical: 7,
		borderBottomWidth: 1,
		borderBottomColor: C.border
	}
});

export default connect(null, {updateSchedule})(NewSchedulingSection);
