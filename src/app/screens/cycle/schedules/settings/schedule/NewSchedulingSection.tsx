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
import {connect} from 'react-redux';
import {AppSwitch} from '../../../../../components/common/AppSwitch';
import {updateSchedule} from '../../../../../../module/process/infrasctructure/store/actions/schedule';

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
	muted: '#718096',
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
	sec: {label: 'Secondes', lo: 0, hi: 59, type: 'num'},
	min: {label: 'Minutes', lo: 0, hi: 59, type: 'num'},
	hour: {label: 'Heures', lo: 0, hi: 23, type: 'num'},
	dom: {label: 'Jour du mois', lo: 1, hi: 31, type: 'num'},
	month: {
		label: 'Mois',
		lo: 1,
		hi: 12,
		type: 'name',
		names: [
			'Jan',
			'Fev',
			'Mar',
			'Avr',
			'Mai',
			'Jun',
			'Jul',
			'Aou',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		],
		base: 1
	},
	dow: {
		label: 'Jour de semaine',
		lo: 0,
		hi: 6,
		type: 'name',
		names: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
		base: 0
	}
};

const ORDER: FieldKey[] = ['sec', 'min', 'hour', 'dom', 'month', 'dow'];
const DAYORDER: FieldKey[] = ['dom', 'month', 'dow'];
const TABLABEL: Record<FieldKey, string> = {
	sec: 'Sec',
	min: 'Min',
	hour: 'Heure',
	dom: 'Jour',
	month: 'Mois',
	dow: 'Semaine'
};
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

// Date ponctuelle -> expression cron (sec min heure jour mois *) correspondante.
function oneTimeCronStr(ts: number): string {
	const d = new Date(ts);
	return [
		d.getSeconds(),
		d.getMinutes(),
		d.getHours(),
		d.getDate(),
		d.getMonth() + 1,
		'*'
	].join(' ');
}

// Libellé lisible d'une date ponctuelle.
function formatOneTime(ts: number): string {
	return new Date(ts).toLocaleString('fr-FR', {
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
	date: number | null;
	sunBehavior?: SunBehaviorDto;
	after?: number;
}

// État de l'interface -> DTO cron (staging vers redux).
function mapToDto(s: CronState): CronDto {
	if (s.oneTime.enabled) {
		return {
			date: s.oneTime.date,
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
	if (!cron) return s;
	if (cron.pattern) applyCronString(s, cron.pattern);
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
		s.oneTime.date = cron.date;
	}
	return s;
}

function describeField(s: CronState, key: FieldKey): string | null {
	const f = s.fields[key];
	if (f.mode === 'every') return null;
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
		return TABLABEL[key] + ' ' + nameOf(key, f.from) + ' a ' + nameOf(key, f.to);
	if (f.mode === 'step') return TABLABEL[key] + ' pas de ' + f.step;
	return null;
}

function summaryText(s: CronState): string {
	const parts = ORDER.map(k => describeField(s, k)).filter(Boolean);
	return parts.length ? parts.join(' - ') : 'Chaque unite (toutes les minutes)';
}

function daySummaryText(s: CronState): string {
	const parts = DAYORDER.map(k => describeField(s, k)).filter(Boolean);
	return parts.length ? parts.join(' - ') : 'tous les jours';
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

function nextRuns(s: CronState, n: number): Date[] {
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
	const d = new Date();
	d.setSeconds(0, 0);
	d.setMinutes(d.getMinutes() + 1);
	const results: Date[] = [];
	let iter = 0;
	while (results.length < n && iter < 300000) {
		iter++;
		const month = d.getMonth() + 1;
		const dom = d.getDate();
		const dow = d.getDay();
		const hour = d.getHours();
		const minute = d.getMinutes();
		let dayOk;
		if (domEvery && dowEvery) dayOk = true;
		else if (domEvery) dayOk = dowM(dow);
		else if (dowEvery) dayOk = domM(dom);
		else dayOk = domM(dom) || dowM(dow);
		if (monM(month) && dayOk && hrM(hour) && minM(minute)) {
			results.push(new Date(d));
		}
		d.setMinutes(d.getMinutes() + 1);
	}
	return results;
}

// --- Calcul solaire (algorithme du mockup) ---------------------------------
function sunTimeUT(
	date: Date,
	lat: number,
	lon: number,
	isSunrise: boolean
): number | null {
	const rad = Math.PI / 180;
	const start = new Date(date.getFullYear(), 0, 0);
	const n = Math.floor((date.getTime() - start.getTime()) / 86400000);
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
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)
	);
	const offsetMin = (sol.offsetH * 60 + sol.offsetM) * (sol.dir === 'BEFORE' ? -1 : 1);
	return new Date(d.getTime() + offsetMin * 60000);
}

function nextSolarRuns(s: CronState, n: number): Date[] {
	const results: Date[] = [];
	const now = new Date();
	for (let i = 0; i < 400 && results.length < n; i++) {
		const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
		const t = solarEventTime(s, day);
		if (t && t.getTime() > now.getTime()) results.push(t);
	}
	return results;
}

function nextCombinedRuns(s: CronState, n: number): Date[] {
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
		const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
		const month = day.getMonth() + 1;
		const dom = day.getDate();
		const dow = day.getDay();
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

function solarDescription(s: CronState): string | null {
	const sol = s.solar;
	if (!sol.enabled) return null;
	const evLabel = sol.event === 'SUNRISE' ? 'lever du soleil' : 'coucher du soleil';
	const dirLabel = sol.dir === 'BEFORE' ? 'avant' : 'apres';
	const offParts: string[] = [];
	if (sol.offsetH > 0) offParts.push(sol.offsetH + 'h');
	if (sol.offsetM > 0) offParts.push(sol.offsetM + 'min');
	const offLabel = offParts.join(' ');
	const offText = sol.offsetH === 0 && sol.offsetM === 0 ? '' : ' ' + dirLabel + ' ' + offLabel;
	return evLabel + offText;
}

const MODES: [FieldMode, string][] = [
	['every', 'Chaque'],
	['list', 'Liste'],
	['range', 'Intervalle'],
	['step', 'Pas'],
	['free', 'Texte libre']
];

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
	return (
		<TextInput
			keyboardType="number-pad"
			value={String(value)}
			onChangeText={t => onChange(parseInt(t, 10) || 0)}
			style={[styles.numInput, {width}, invalid && styles.inputInvalid]}
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
				placeholder="ex: 0,15,30,45"
				placeholderTextColor={C.muted}
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
					Valeurs entre {lo} et {hi}, separees par des virgules.
				</Text>
			) : (
				<Text style={styles.hint}>
					Valeurs separees par des virgules, entre {lo} et {hi}.
				</Text>
			)}
		</>
	);
}

// --- Composant principal ---------------------------------------------------
export function NewSchedulingSection(props: any) {
	// Initialisation depuis le modèle `schedule.cron` (une seule fois).
	const initial = React.useMemo(
		() => dtoToState(props.scheduleData?.cron),
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
			props.updateSchedule?.({
				...parentRef.current,
				cron: dto,
				isModified: true
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state]);

	const oneTimeEnabled = state.oneTime.enabled;
	const [pickerVisible, setPickerVisible] = React.useState(false);
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
				displayStr: oneTimeCronStr(ts),
				summary: 'Date ponctuelle : ' + formatOneTime(ts),
				solarStr: null,
				runs: ts > Date.now() ? [new Date(ts)] : []
			};
		}
		const sol = state.solar;
		const combine = sol.enabled && sol.mode === 'combine';
		// En mode « combiner », l'expression ne porte que jour/mois/semaine ;
		// sinon c'est l'expression cron complète.
		const dStr = combine ? buildDayCronStr(state) : buildCronStr(state);
		const sum = combine ? daySummaryText(state) : summaryText(state);
		const solStr = sol.enabled ? solarDescription(state) : null;
		let r: Date[];
		if (sol.enabled && sol.mode === 'replace') r = nextSolarRuns(state, 5);
		else if (combine) r = nextCombinedRuns(state, 5);
		else r = nextRuns(state, 5);
		return {displayStr: dStr, summary: sum, solarStr: solStr, runs: r};
	}, [state]);

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
		? `Valeurs entre ${cfg.lo} et ${cfg.hi}.`
		: orderInvalid
		? 'Le debut doit etre inferieur ou egal a la fin.'
		: null;
	const stepInvalid = f.step < 1 || f.step > cfg.hi;
	const stepError = stepInvalid ? `Le pas doit etre entre 1 et ${cfg.hi}.` : null;

	// Bornes du décalage solaire.
	const offHInvalid = state.solar.offsetH < 0 || state.solar.offsetH > 23;
	const offMInvalid = state.solar.offsetM < 0 || state.solar.offsetM > 59;

	return (
		<View style={styles.wrap}>
			{/* Date ponctuelle : planifie une seule exécution via le datetime picker. */}
			<View style={styles.switchRow}>
				<Text style={styles.switchLabel}>Date ponctuelle</Text>
				<AppSwitch
					value={oneTimeEnabled}
					onValueChange={v => patch(n => (n.oneTime.enabled = v))}
				/>
			</View>

			{oneTimeEnabled && (
				<View style={styles.editorCard}>
					<Text style={styles.fieldLabel}>Date et heure</Text>
					<TouchableOpacity
						onPress={() => setPickerVisible(true)}
						style={styles.dateField}>
						<Text style={styles.dateFieldTxt}>
							{formatOneTime(state.oneTime.date)}
						</Text>
					</TouchableOpacity>
					<Text style={styles.hint}>
						Une seule execution a la date choisie.
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
						<View style={styles.chipsWrap}>
							{MODES.map(m => (
								<Chip
									key={m[0]}
									label={m[1]}
									active={f.mode === m[0]}
									onPress={() => patch(n => (n.fields[activeTab].mode = m[0]))}
								/>
							))}
						</View>

						{f.mode === 'every' && (
							<Text style={styles.hint}>Toute valeur (*)</Text>
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
								<View style={styles.rangeRow}>
									{cfg.type === 'name' && cfg.names ? (
										<>
											<RangePicker
												cfg={cfg}
												value={f.from}
												onChange={v => patch(n => (n.fields[activeTab].from = v))}
											/>
											<Text style={styles.rangeSep}>a</Text>
											<RangePicker
												cfg={cfg}
												value={f.to}
												onChange={v => patch(n => (n.fields[activeTab].to = v))}
											/>
										</>
									) : (
										<>
											<NumInput
												value={f.from}
												invalid={fromInvalid}
												onChange={v => patch(n => (n.fields[activeTab].from = v))}
												width={80}
											/>
											<Text style={styles.rangeSep}>a</Text>
											<NumInput
												value={f.to}
												invalid={toInvalid || orderInvalid}
												onChange={v => patch(n => (n.fields[activeTab].to = v))}
												width={80}
											/>
										</>
									)}
								</View>
								{cfg.type !== 'name' &&
									(rangeError ? (
										<Text style={styles.errorTxt}>{rangeError}</Text>
									) : (
										<Text style={styles.hint}>
											Valeurs entre {cfg.lo} et {cfg.hi}.
										</Text>
									))}
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
											A partir de chaque
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() =>
											patch(n => (n.fields[activeTab].stepBase = 'range'))
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
											Dans un intervalle
										</Text>
									</TouchableOpacity>
								</View>
								{f.stepBase === 'range' && (
									<>
										<View style={styles.rangeRow}>
											<NumInput
												value={f.from}
												invalid={fromInvalid}
												onChange={v => patch(n => (n.fields[activeTab].from = v))}
												width={80}
											/>
											<Text style={styles.rangeSep}>a</Text>
											<NumInput
												value={f.to}
												invalid={toInvalid || orderInvalid}
												onChange={v => patch(n => (n.fields[activeTab].to = v))}
												width={80}
											/>
										</View>
										{rangeError && (
											<Text style={styles.errorTxt}>{rangeError}</Text>
										)}
									</>
								)}
								<View style={styles.inlineRow}>
									<Text style={styles.inlineTxt}>Toutes les</Text>
									<NumInput
										value={f.step}
										invalid={stepInvalid}
										onChange={v => patch(n => (n.fields[activeTab].step = v || 1))}
									/>
									<Text style={styles.inlineTxt}>unites</Text>
								</View>
								{stepError ? (
									<Text style={styles.errorTxt}>{stepError}</Text>
								) : (
									<Text style={styles.hint}>Pas entre 1 et {cfg.hi}.</Text>
								)}
							</>
						)}

						{f.mode === 'free' && (
							<>
								<TextInput
									placeholder="ex: 1-5,10/2,L"
									placeholderTextColor={C.muted}
									defaultValue={f.free}
									autoCapitalize="none"
									onChangeText={t => patch(n => (n.fields[activeTab].free = t))}
									style={styles.textInput}
								/>
								<Text style={styles.hint}>
									Syntaxe cron brute pour ce champ, y compris caracteres speciaux non
									geres ailleurs.
								</Text>
							</>
						)}
					</View>
				</>
			)}

			{/* Déclencheur solaire (masqué en mode date ponctuelle) */}
			{!oneTimeEnabled && (
				<View style={styles.switchRow}>
					<Text style={styles.switchLabel}>Ajouter un declencheur solaire</Text>
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
							? 'Le cron est ignore, seul le declencheur solaire est actif chaque jour.'
							: 'Les jours sont definis par le cron ci-dessus (jour du mois, mois, jour de semaine). Heure, minute et seconde sont remplacees par le declencheur solaire.'}
					</Text>
					<View style={styles.segRow}>
						<SegBtn
							label="Combiner avec le cron"
							active={state.solar.mode === 'combine'}
							onPress={() => patch(n => (n.solar.mode = 'combine'))}
						/>
						<SegBtn
							label="Remplacer le cron"
							active={state.solar.mode === 'replace'}
							onPress={() => patch(n => (n.solar.mode = 'replace'))}
						/>
					</View>
					{/* timeDirection (avant/après) — placé avant le choix lever/coucher. */}
					<View style={styles.segRow}>
						<SegBtn
							label="Avant"
							active={state.solar.dir === 'BEFORE'}
							onPress={() => patch(n => (n.solar.dir = 'BEFORE'))}
						/>
						<SegBtn
							label="Apres"
							active={state.solar.dir === 'AFTER'}
							onPress={() => patch(n => (n.solar.dir = 'AFTER'))}
						/>
					</View>
					<View style={styles.segRow}>
						<SegBtn
							label="Lever du soleil"
							active={state.solar.event === 'SUNRISE'}
							onPress={() => patch(n => (n.solar.event = 'SUNRISE'))}
						/>
						<SegBtn
							label="Coucher du soleil"
							active={state.solar.event === 'SUNSET'}
							onPress={() => patch(n => (n.solar.event = 'SUNSET'))}
						/>
					</View>
					<View style={styles.inlineRow}>
						<Text style={styles.inlineTxt}>Decalage</Text>
						<NumInput
							value={state.solar.offsetH}
							invalid={offHInvalid}
							onChange={v => patch(n => (n.solar.offsetH = v))}
							width={54}
						/>
						<Text style={styles.inlineMuted}>h</Text>
						<NumInput
							value={state.solar.offsetM}
							invalid={offMInvalid}
							onChange={v => patch(n => (n.solar.offsetM = v))}
							width={54}
						/>
						<Text style={styles.inlineMuted}>min</Text>
					</View>
					{(offHInvalid || offMInvalid) && (
						<Text style={styles.errorTxt}>
							Decalage : heures 0 a 23, minutes 0 a 59.
						</Text>
					)}
				</View>
			)}

			{/* Expression */}
			<View style={styles.outCard}>
				{oneTimeEnabled ? (
					<>
						<Text style={styles.sectionLabel}>Expression</Text>
						<Text selectable style={styles.expression}>
							{displayStr}
						</Text>
						<Text style={styles.summary}>{summary}</Text>
					</>
				) : (
					/* En mode « remplacer » le cron est ignoré : pas d'expression cron. */
					!replaceMode && (
						<>
							<Text style={styles.sectionLabel}>Expression</Text>
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
								placeholderTextColor={C.muted}
								style={styles.expressionInput}
							/>
							<Text style={styles.hint}>
								{combineMode
									? 'Editez le cron jour/mois/semaine (3 champs) pour mettre a jour les champs ci-dessus.'
									: "Editez l'expression cron pour mettre a jour les champs ci-dessus (5 ou 6 champs)."}
							</Text>
							<Text style={styles.summary}>{summary}</Text>
						</>
					)
				)}

				{/* Expression du déclencheur solaire (séparée, n'altère pas le cron). */}
				{solarStr && (
					<View style={replaceMode ? undefined : styles.solarExprBox}>
						<Text style={styles.sectionLabel}>Declencheur solaire</Text>
						<Text selectable style={styles.solarExpr}>
							{solarStr}
						</Text>
						<Text style={styles.summary}>
							{state.solar.mode === 'replace'
								? 'Remplace le cron : declenche au ' + solarStr + ' chaque jour.'
								: 'Combine au cron : aux jours du cron, a ' + solarStr + '.'}
						</Text>
					</View>
				)}
			</View>

			{/* Prochaines exécutions */}
			<View style={styles.outCard}>
				<Text style={styles.sectionLabel}>Prochaines executions</Text>
				{runs.length === 0 ? (
					<Text style={styles.hint}>
						Aucune correspondance trouvee dans la fenetre calculee.
					</Text>
				) : (
					runs.map((d, i) => (
						<Text key={i} style={styles.runRow}>
							{d.toLocaleDateString('fr-FR', {
								weekday: 'short',
								day: '2-digit',
								month: 'short'
							})}
							{', '}
							{d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
						</Text>
					))
				)}
			</View>

			{/* Sélecteur de date ponctuelle (même picker que la section Execution). */}
			<DateTimePickerModal
				isVisible={pickerVisible}
				mode="datetime"
				display="inline"
				themeVariant="light"
				isDarkModeEnabled={false}
				date={new Date(state.oneTime.date)}
				minimumDate={new Date()}
				onConfirm={d => {
					setPickerVisible(false);
					patch(n => (n.oneTime.date = d.getTime()));
				}}
				onCancel={() => setPickerVisible(false)}
			/>
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

function RangePicker({
	cfg,
	value,
	onChange
}: {
	cfg: (typeof FIELDCFG)[FieldKey];
	value: number;
	onChange: (v: number) => void;
}) {
	if (!cfg.names) return null;
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.rangePicker}
			contentContainerStyle={styles.rowScroll}>
			{cfg.names.map((nm, i) => {
				const v = cfg.base === 0 ? i : i + 1;
				return (
					<Chip key={nm} label={nm} active={value === v} onPress={() => onChange(v)} />
				);
			})}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	// Contenu calé sur la verticale de l'icône de l'en-tête (marginLeft: 10 du
	// MenuAccordion) pour que tout s'aligne sous l'icône de la section.
	wrap: {paddingLeft: 10, paddingRight: 10, paddingTop: 4, paddingBottom: 14},
	sectionLabel: {
		fontSize: 13,
		color: C.text,
		marginBottom: 8,
		marginTop: 4,
		fontWeight: 'bold'
	},
	rowScroll: {gap: 8, paddingVertical: 2, paddingRight: 10},
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
	switchLabel: {
		flexShrink: 1,
		marginRight: 8,
		color: C.text,
		fontSize: 15,
		fontWeight: 'bold'
	},
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
	fieldLabel: {fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: '600'},
	chipsWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4},
	chip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1
	},
	chipIdle: {backgroundColor: C.surface, borderColor: C.border},
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
		height: 50,
		justifyContent: 'center'
	},
	dateFieldTxt: {color: C.text, fontSize: 15, fontWeight: 'bold'},
	textInput: {
		marginTop: 10,
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 44,
		color: C.text,
		fontSize: 15,
		fontWeight: 'bold'
	},
	numInput: {
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		height: 44,
		textAlign: 'center',
		color: C.text,
		fontSize: 15,
		fontWeight: 'bold'
	},
	rangeRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6},
	rangeSep: {fontSize: 14, color: C.muted, marginHorizontal: 2},
	rangePicker: {flex: 1},
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
	outCard: {
		backgroundColor: C.surface,
		borderRadius: 12,
		padding: 14,
		marginTop: 14,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	expression: {
		fontFamily: 'Courier',
		fontSize: 16,
		fontWeight: '700',
		color: C.text,
		marginBottom: 10
	},
	expressionInput: {
		fontFamily: 'Courier',
		fontSize: 16,
		fontWeight: '700',
		color: C.text,
		backgroundColor: C.surface,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 46
	},
	summary: {fontSize: 13, color: C.secondary, lineHeight: 18},
	solarExprBox: {
		marginTop: 12,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: C.border
	},
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
