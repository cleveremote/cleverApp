import React, {useEffect, useRef} from 'react';
import {connect, useSelector} from 'react-redux';
import {Controller, useForm} from 'react-hook-form';
import CycleStack from '../../components/cycle/cycleStack';
import GroupStack from '../../components/cycle/groupStack';
import CycleFilterBar, {FilterKey} from '../../components/cycle/CycleFilterBar';
import {ScrollView, RefreshControl} from 'react-native-gesture-handler';
import Orientation, {OrientationType} from 'react-native-orientation-locker';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {styles} from '../../styles/cycleStyles';
import {ActivityIndicator, AppState, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
	executeCycle,
	listenerEvents,
	loadCycles,
	loadEvents,
	loadGroups
} from '../../../module/process/infrasctructure/store/actions/cycle';
import {OUTCOMES, RunListItem} from '../../components/cycle/RunCard';
import {FlashList} from '@shopify/flash-list';
import {ModalCreateChoice} from '../../components/cycle/ModalCreateChoice';
import {DropdownSelect} from '../../components/common/FormComponents';
import {DateRangePickerForm} from '../../components/common/DateRangePickerForm';
import {TimeZoneNotice} from '../../components/common/TimeZoneNotice';
import {endOfDayIn, startOfDayIn} from '../../../services/time';
import {selectBoxTimeZone} from '../../../module/process/infrasctructure/store/models/boxSettings';
import {CycleRun, RunOutcome} from '../../../module/process/infrasctructure/store/models/cycleHistory';
import {EventsPage} from '../../../module/process/infrasctructure/store/actions/cycle';
import {isModuleType, MODULE, PROPORTIONAL} from '../../data/cycleTypes';
import {isProportionalOn} from '../../components/cycle/ProportionalControl';
import {
	FilterChips,
	SearchField,
	PillButton,
	normalizeSearch,
	showsSearch
} from '../../components/common/ListFilters';
import {loadActuators} from '../../../module/process/infrasctructure/store/actions/actuator';
import {EVENTS_PAGE_SIZE} from '../../components/common/useLocalPagination';

const IN_PROCESS = 'IN_PROCCESS';
const ALL_DEVICES = 'ALL';

type EventCriteria = {
	deviceId: string;
	startDate: Date;
	endDate: Date;
};

// Filtre de type des modules : un seul à la fois, « tout » = aucun.
type ModuleTypeFilter = 'all' | typeof MODULE | typeof PROPORTIONAL;
const MODULE_TYPE_FILTERS = [
	{key: 'all', label: 'cycle:moduleFilter.all'},
	{key: MODULE, label: 'cycle:create.onOff'},
	{key: PROPORTIONAL, label: 'cycle:create.proportionalShort'}
] as const satisfies readonly {key: ModuleTypeFilter; label: string}[];
const FILTER_COLOR = '#32404e';
const EVENTS_TIMEOUT_MS = 15000;

// Filtre d'état des événements : un seul à la fois, « tout » = aucun.
type RunFilter = 'all' | 'active' | 'ended' | 'stopped';

// Espace entre les cartes de la liste des événements.
const RunSeparator = () => <View style={{height: 8}} />;

const RUN_FILTERS: {key: RunFilter; outcomes: RunOutcome[]; color: string}[] = [
	{key: 'all', outcomes: [], color: FILTER_COLOR},
	{
		key: 'active',
		outcomes: ['RUNNING', 'WAITING_CONFIRMATION', 'QUEUED'],
		color: OUTCOMES.RUNNING.color
	},
	{key: 'ended', outcomes: ['ENDED'], color: OUTCOMES.ENDED.color},
	{
		key: 'stopped',
		outcomes: ['CANCELLED', 'REFUSED'],
		color: OUTCOMES.REFUSED.color
	}
];

const filterFromTypeFilter = (typeFilter?: string): FilterKey => {
	if (typeFilter === 'MODULE') {
		return 'MODULE';
	}
	return 'CYCLE';
};

export function Cycle(props: any) {
	const {t} = useTranslation(['cycle', 'common']);
	const [activeMenu, setActiveMenu] = React.useState<string>();
	const [activeFilter, setActiveFilter] = React.useState<FilterKey>(
		filterFromTypeFilter(props.route?.params?.typeFilter)
	);
	const [moduleType, setModuleType] = React.useState<ModuleTypeFilter>('all');
	const [moduleSearch, setModuleSearch] = React.useState('');
	const [cycleSearch, setCycleSearch] = React.useState('');
	const [runFilter, setRunFilter] = React.useState<RunFilter>('all');
	// Lu par les requêtes lancées en différé (reloadEvents) : toujours à jour.
	const runFilterRef = useRef(runFilter);
	runFilterRef.current = runFilter;
	// Pagination côté box : vrai tant que la dernière page reçue était pleine.
	const [hasMoreRuns, setHasMoreRuns] = React.useState(false);
	const loadingMoreRef = useRef(false);
	// Requête d'événements en cours : seule la dernière lancée arrête le loader.
	// 'blocking' : loader plein écran (arrivée sur l'onglet, la liste en mémoire
	// peut être celle d'un autre écran). 'background' : changement de critère,
	// la liste reste affichée avec un petit indicateur.
	const [eventsLoading, setEventsLoading] = React.useState<
		false | 'blocking' | 'background'
	>(false);
	const eventsRequestRef = useRef(0);
	const [orientation, setOrientation] = React.useState<OrientationType>(
		OrientationType.UNKNOWN
	);
	const [refreshing, setRefreshing] = React.useState<boolean>(false);
	const [isLoading, setIsLoading] = React.useState<boolean>(false);
	const [createChoiceVisible, setCreateChoiceVisible] =
		React.useState<boolean>(false);
	const [expandedRunId, setExpandedRunId] = React.useState<string | null>(
		null
	);

	const appState = useRef(AppState.currentState);

	// Critères de l'onglet événements, dates en heure de la box comme l'écran
	// d'historique d'un cycle.
	const tz: string = useSelector(selectBoxTimeZone);
	const {control, getValues} = useForm<any>({
		defaultValues: {
			deviceId: ALL_DEVICES,
			startDate: new Date(startOfDayIn(tz)),
			endDate: new Date(endOfDayIn(tz))
		}
	});

	useEffect(() => {
		const subscription = AppState.addEventListener(
			'change',
			async nextAppState => {
				if (
					appState.current.match(/inactive|background/) &&
					nextAppState === 'active'
				) {
					await onRefresh();
				}
				appState.current = nextAppState;
			}
		);
		return () => {
			subscription.remove();
		};
	}, []);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () => brandLogo()
		});

		const initial = Orientation.getInitialOrientation();
		setOrientation(initial);
		Orientation.addOrientationListener(or => {
			setOrientation(or);
		});
	}, []);

	// The "+" header opens creation for the currently selected filter. Cycles
	// and GROUPs share the 'CYCLE' segment, MODULE and PROPORTIONAL the
	// 'MODULE' one, so the user picks the kind first. Keyed on activeFilter so the handler always
	// targets the visible segment.
	const openCreate = (params: any) => {
		props.navigation.navigate('Settings', {
			screen: 'CycleSettingsMenu',
			params
		});
	};

	// Période + cycle (sans deviceId : tous les cycles) + filtre d'état,
	// paginés par la box (EVENTS_PAGE_SIZE runs par page).
	const eventsQuery = () => {
		const c = getValues() as EventCriteria;
		const outcomes = RUN_FILTERS.find(
			f => f.key === runFilterRef.current
		)?.outcomes;
		return {
			...(c.deviceId !== ALL_DEVICES && {deviceId: c.deviceId}),
			startDate: c.startDate,
			endDate: c.endDate,
			...(outcomes?.length && {outcomes}),
			limit: EVENTS_PAGE_SIZE
		};
	};
	// Première page : remplace la liste.
	const loadRecentEvents = (blocking = true) => {
		const request = ++eventsRequestRef.current;
		loadingMoreRef.current = false;
		const done = (page?: EventsPage) => {
			if (eventsRequestRef.current !== request) return;
			setEventsLoading(false);
			if (page) setHasMoreRuns(page.received >= EVENTS_PAGE_SIZE);
		};
		setEventsLoading(blocking ? 'blocking' : 'background');
		setHasMoreRuns(false);
		// Sans réponse de la box (déconnexion), le loader ne reste pas affiché.
		setTimeout(done, EVENTS_TIMEOUT_MS);
		props.loadEvents(eventsQuery(), done);
	};
	// Page suivante, à la suite du dernier run reçu. Arrêt si la box renvoie
	// une page incomplète, ou rien de nouveau (box sans pagination).
	const loadMoreRuns = () => {
		const last = (props.events ?? [])[(props.events ?? []).length - 1];
		if (!hasMoreRuns || eventsLoading || loadingMoreRef.current || !last) {
			return;
		}
		const request = eventsRequestRef.current;
		loadingMoreRef.current = true;
		const done = (page?: EventsPage) => {
			if (eventsRequestRef.current !== request || !loadingMoreRef.current) {
				return;
			}
			loadingMoreRef.current = false;
			setHasMoreRuns(
				!!page && page.received >= EVENTS_PAGE_SIZE && page.added > 0
			);
		};
		setTimeout(done, EVENTS_TIMEOUT_MS);
		props.loadEvents({...eventsQuery(), afterRunId: last.runId}, done);
	};
	// Laisse le formulaire enregistrer la valeur avant de relancer la requête.
	const reloadEvents = () => setTimeout(() => loadRecentEvents(false), 0);

	// Les cartes PROPORTIONAL prennent les bornes de leur slider dans
	// l'actuator (vanne CTRL) qu'elles pilotent.
	useEffect(() => {
		if (activeFilter === 'MODULE') props.loadActuators();
	}, [activeFilter]);

	// Le slice `events` est partagé avec l'écran d'historique d'un cycle : on
	// recharge à chaque retour sur l'onglet pour ne pas afficher un seul cycle.
	useEffect(() => {
		if (activeFilter !== 'EVENTS') return;
		loadRecentEvents();
		return props.navigation.addListener('focus', () => loadRecentEvents());
	}, [activeFilter]);

	useEffect(() => {
		if (activeFilter === 'EVENTS') {
			props.navigation.setOptions({headerRight: undefined});
			return;
		}
		const onCreate = () => setCreateChoiceVisible(true);
		props.navigation.setOptions({
			headerRight: () => navigationHeader(onCreate, 'times-circle', true)
		});
	}, [activeFilter]);

	const closeSibillings = (isExpended: boolean, current?: string) => {
		if (isExpended) {
			setActiveMenu(current);
		} else {
			setActiveMenu(undefined);
		}
	};

	const onSwitch = async (cycleData: any, value: any, type: string) => {
		const dto = {
			id: cycleData.id,
			status: 'STOPPED',
			action: !value ? 'OFF' : 'ON',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: type, //'INIT',// 'QUEUED'
			duration: 0
		};

		// Rendu à l'appelant : « Ignorer » d'un PROPORTIONAL attend l'acquit.
		return props.executeCycle(dto);
	};

	//override function for settinf custom execution time for all sequences .
	const onExecute = (id: string, ms: number) => {
		const dto = {
			id: id,
			status: 'STOPPED',
			action: 'ON',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'INIT', // 'QUEUED'
			duration: ms
		};
		props.executeCycle(dto);
	};

	const onSkip = (sequenceId: string) => {
		const dto = {
			id: sequenceId,
			status: 'STOPPED',
			action: 'OFF',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'SKIP', // 'QUEUED'
			duration: 0
		};
		props.executeCycle(dto);
	};

	// Force une séquence dont les conditions ne sont pas vérifiées : le box la
	// met en file et la démarre dès que la séquence en cours est terminée.
	const onForceSequence = (sequenceId: string) => {
		props.executeCycle({
			id: sequenceId,
			type: 'FORCE_SEQUENCE',
			action: 'ON'
		});
	};

	// Conflit : met le cycle en file, il démarrera après celui en cours.
	const onQueueCycle = (cycleId: string) => {
		props.executeCycle({
			id: cycleId,
			type: 'QUEUED',
			action: 'ON'
		});
	};

	// Group (fertigation) handlers carry an extra `executableType`, mirroring
	// GroupsScreen so GroupStack children behave identically here.
	const onGroupSwitch = async (
		itemData: any,
		value: any,
		type: string,
		executableType: string
	) => {
		const dto = {
			id: itemData.id,
			status: 'STOPPED',
			action: !value ? 'OFF' : 'ON',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: type,
			duration: 0,
			executableType
		};
		props.executeCycle(dto);
	};

	const onGroupExecute = (id: string, ms: number, executableType: string) => {
		const dto = {
			id: id,
			status: 'STOPPED',
			action: 'ON',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'INIT',
			duration: ms,
			executableType
		};
		props.executeCycle(dto);
	};

	const onGroupSkip = (sequenceId: string, executableType: string) => {
		const dto = {
			id: sequenceId,
			status: 'STOPPED',
			action: 'OFF',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'SKIP',
			duration: 0,
			executableType
		};
		props.executeCycle(dto);
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await Promise.all([
			props.loadCycles(),
			props.loadGroups(),
			activeFilter === 'EVENTS' && loadRecentEvents(false)
		]);
		setRefreshing(false);
	};

	const statusOf = (id: string): string | undefined =>
		props.status?.find((x: any) => x?.id === id)?.status;

	const cycles = props.cycles ?? [];
	const groups = props.groups ?? [];

	const topLevelCycles = cycles
		.filter((x: any) => !x.delete && x.display !== false)
		.filter((x: any) => !x.parentCycleId);

	const cycleItems = topLevelCycles.filter(
		(x: any) => !isModuleType(x.type) && x.type !== 'GROUP'
	);
	const moduleItems = cycles
		.filter((x: any) => !x.delete && x.display !== false)
		.filter((x: any) => isModuleType(x.type));
	// Recherche sur le nom seul : la description n'est pas affichée sur les
	// cartes (et garde souvent sa valeur par défaut « new cycle »).
	const matchesQuery = (x: any, query: string) =>
		!query || (!!x?.name && normalizeSearch(`${x.name}`).includes(query));
	// Filtres masqués (peu d'éléments) : ils ne filtrent plus rien.
	const moduleFiltersShown = showsSearch(moduleItems.length);
	const moduleQuery = moduleFiltersShown
		? normalizeSearch(moduleSearch.trim())
		: '';
	const filteredModuleItems = moduleItems.filter(
		(x: any) =>
			(!moduleFiltersShown ||
				moduleType === 'all' ||
				x.type === moduleType) &&
			matchesQuery(x, moduleQuery)
	);
	const groupItems = groups.filter(
		(x: any) => !x.delete && x.display !== false
	);
	const cycleSearchShown = showsSearch(groupItems.length + cycleItems.length);
	const cycleQuery = cycleSearchShown
		? normalizeSearch(cycleSearch.trim())
		: '';
	const filteredCycleItems = cycleItems.filter((x: any) =>
		matchesQuery(x, cycleQuery)
	);
	// Un groupe reste affiché si son nom ou l'un de ses cycles correspond.
	const filteredGroupItems = groupItems.filter(
		(group: any) =>
			matchesQuery(group, cycleQuery) ||
			(group.childCycles ?? []).some((child: any) =>
				matchesQuery(
					cycles.find((c: any) => c.id === child.cycleId),
					cycleQuery
				)
			)
	);

	// Modules ON. Le sélecteur renvoie un nombre : l'écran (et toutes ses
	// cartes) ne se re-rend que si ce nombre change, et non à chaque valeur
	// de capteur poussée par la box (plusieurs par seconde).
	// PROPORTIONAL à 0 % (slider ou entrée FOLLOW) : pas compté ON.
	const moduleOnCount: number = useSelector((s: any) => {
		const proportionalState = {
			actuators: s.root_actuator.actuators,
			controlLoops: s.root_control_loop.loops,
			sensors: s.root_sensor.sensors,
			sensorValues: s.root_sensor.values
		};
		return moduleItems.filter((x: any) =>
			x.type === PROPORTIONAL
				? isProportionalOn(x, statusOf(x.id), proportionalState)
				: statusOf(x.id) === IN_PROCESS
		).length;
	});
	const counts = {
		CYCLE: [...groupItems, ...cycleItems].filter(
			(x: any) => statusOf(x.id) === IN_PROCESS
		).length,
		MODULE: moduleOnCount
	};

	const renderGroups = () =>
		filteredGroupItems.map((group: any) => (
			<GroupStack
				key={group.id}
				groupData={group}
				cycles={cycles}
				navigation={props.navigation}
				current={activeMenu}
				orientation={orientation}
				closeSibillings={closeSibillings}
				onSwitch={onGroupSwitch}
				onSkip={onGroupSkip}
				onForceSequence={onForceSequence}
				onQueueCycle={onQueueCycle}
				onExecute={onGroupExecute}
			/>
		));

	// Ordre de la box (du plus récent au plus ancien) : pas de re-tri local,
	// sinon une page ajoutée pourrait s'intercaler dans la liste déjà vue.
	const recentRuns: CycleRun[] = (props.events ?? []) as CycleRun[];
	const filteredRuns = React.useMemo(() => {
		const outcomes = RUN_FILTERS.find(f => f.key === runFilter)?.outcomes;
		return outcomes?.length
			? recentRuns.filter(run => outcomes.includes(run.outcome))
			: recentRuns;
	}, [recentRuns, runFilter]);
	const toggleRun = React.useCallback(
		(runId: string) =>
			setExpandedRunId(prev => (prev === runId ? null : runId)),
		[]
	);

	const deviceOptions = [
		{label: t('cycle:events.allDevices'), value: ALL_DEVICES},
		...[...groupItems, ...cycleItems, ...moduleItems].map((x: any) => ({
			label: x.name ?? x.id,
			value: x.id
		}))
	];

	// Même style que la recherche des cycles / modules : champs gris arrondis.
	const renderEventCriteria = () => (
		<View style={{paddingHorizontal: 14}}>
			<Controller
				control={control}
				name="deviceId"
				render={({field: {onChange, value}}) => (
					<DropdownSelect<{label: string; value: string; iconColor?: {base: string}}>
						items={deviceOptions}
						value={value}
						getLabel={item => `${item.label}`}
						getValue={item => `${item.value}`}
						hasError={false}
						onChange={val => {
							onChange(val);
							reloadEvents();
						}}
						renderTrigger={(label, open) => (
							<PillButton
								icon="filter"
								label={label}
								placeholder={t('cycle:events.device')}
								onPress={open}
							/>
						)}
					/>
				)}
			/>
			<DateRangePickerForm
				control={control}
				startName="startDate"
				endName="endDate"
				timeZone={tz}
				placeholder={t('cycle:events.period')}
				onChange={reloadEvents}
				renderTrigger={(label, open) => (
					<PillButton
						icon="calendar-alt"
						label={label}
						placeholder={t('cycle:events.period')}
						onPress={open}
					/>
				)}
			/>
			<FilterChips
				chips={RUN_FILTERS.map(({key, color}) => ({
					key,
					color,
					label: t(`cycle:events.filter.${key}`)
				}))}
				isActive={key => runFilter === key}
				// Re-toucher le filtre actif revient à « tout ». Filtrage local
				// immédiat, puis rechargement filtré par la box (pagination).
				onToggle={key => {
					const next = runFilter === key ? 'all' : key;
					setRunFilter(next);
					runFilterRef.current = next;
					reloadEvents();
				}}
			/>
			{/* Nombre d'événements affichés, à la couleur du filtre actif ; masqué
			    pendant la requête (loader sur la liste). */}
			<View
				style={{
					alignSelf: 'flex-end',
					minHeight: 18,
					flexDirection: 'row',
					alignItems: 'center',
					gap: 6
				}}>
				{eventsLoading === 'background' ? (
					<ActivityIndicator
						size="small"
						color={RUN_FILTERS.find(f => f.key === runFilter)?.color}
					/>
				) : null}
				{eventsLoading === 'blocking' ? null : (
					<Text
						style={{
							color: RUN_FILTERS.find(f => f.key === runFilter)?.color,
							fontSize: 13,
							fontWeight: '600'
						}}>
						{t('cycle:events.count', {count: filteredRuns.length})}
					</Text>
				)}
			</View>
			<TimeZoneNotice kind="box" style={{marginTop: 4, marginHorizontal: -10}} />
		</View>
	);

	// Index des noms calculé une fois par réponse, plutôt qu'un parcours de
	// tous les runs à chaque appel depuis chaque carte.
	const nameOf = React.useMemo(() => {
		const names: Record<string, string> = {};
		recentRuns.forEach(run =>
			(run.timeline || []).forEach(e => {
				if (e.elementId && e.name && !names[e.elementId]) {
					names[e.elementId] = e.name;
				}
			})
		);
		[...cycles, ...groups].forEach((x: any) => {
			if (x?.id && x.name) names[x.id] = x.name;
		});
		return (id: string) => names[id] || id;
	}, [recentRuns, cycles, groups]);

	const renderRecentEvents = () => {
		if (eventsLoading === 'blocking') {
			return (
				<ActivityIndicator
					key="eventsLoader"
					size="large"
					color={RUN_FILTERS.find(f => f.key === runFilter)?.color}
					style={{marginTop: 32}}
				/>
			);
		}
		if (!filteredRuns.length) {
			return (
				<Text style={{color: '#777', textAlign: 'center', marginTop: 24}}>
					{t(
						recentRuns.length
							? 'cycle:events.noMatch'
							: 'cycle:events.noRun'
					)}
				</Text>
			);
		}
		// Liste non vide : rendue par la FlashList (cf. return).
		return null;
	};

	const renderModuleFilters = () =>
		moduleFiltersShown ? (
			<View key="moduleFilters" style={{paddingHorizontal: 14}}>
				<SearchField
					value={moduleSearch}
					onChange={setModuleSearch}
					placeholder={t('cycle:moduleFilter.search')}
					clearLabel={t('cycle:moduleFilter.clearSearch')}
				/>
				<FilterChips
					chips={MODULE_TYPE_FILTERS.map(({key, label}) => ({
						key,
						label: t(label),
						color: FILTER_COLOR
					}))}
					isActive={key => moduleType === key}
					// Re-toucher le filtre actif revient à « tout ».
					onToggle={key =>
						setModuleType(prev => (prev === key ? 'all' : key))
					}
				/>
			</View>
		) : null;

	const renderCycleSearch = () =>
		cycleSearchShown ? (
			<View key="cycleSearch" style={{paddingHorizontal: 14}}>
				<SearchField
					value={cycleSearch}
					onChange={setCycleSearch}
					placeholder={t('cycle:cycleFilter.search')}
					clearLabel={t('cycle:moduleFilter.clearSearch')}
				/>
			</View>
		) : null;

	// Bloc recherche / filtres de l'onglet, figé au-dessus de la liste (seule
	// la liste défile).
	const renderFixedFilters = () => {
		if (activeFilter === 'EVENTS') return renderEventCriteria();
		return activeFilter === 'MODULE'
			? renderModuleFilters()
			: renderCycleSearch();
	};

	const noMatch = (key: string) => (
		<Text
			key="noMatch"
			style={{color: '#777', textAlign: 'center', marginTop: 24}}>
			{t(key as never)}
		</Text>
	);

	const renderList = () => {
		if (activeFilter === 'EVENTS') {
			return (
				<>{renderRecentEvents()}</>
			);
		}
		const list =
			activeFilter === 'MODULE' ? filteredModuleItems : filteredCycleItems;
		const cycleCards = list.map((cycle: any) => (
			<CycleStack
				key={cycle.id}
				cycleData={cycle}
				navigation={props.navigation}
				current={activeMenu}
				orientation={orientation}
				closeSibillings={closeSibillings}
				onSwitch={(value: boolean, type: string) =>
					onSwitch(cycle, value, type)
				}
				onSkip={onSkip}
				onForceSequence={onForceSequence}
				onQueueCycle={onQueueCycle}
				onExecute={onExecute}
			/>
		));
		// Groups first: they orchestrate the classic cycles listed below.
		if (activeFilter === 'MODULE') {
			return moduleFiltersShown && !filteredModuleItems.length
				? noMatch('cycle:moduleFilter.noMatch')
				: cycleCards;
		}
		const groupCards = renderGroups();
		return cycleSearchShown && !groupCards.length && !cycleCards.length
			? noMatch('cycle:cycleFilter.noMatch')
			: [...groupCards, ...cycleCards];
	};

	// Onglet Événements avec des runs à afficher : FlashList à la place de la
	// ScrollView (chargement et liste vide restent dans la ScrollView).
	const showRunList =
		activeFilter === 'EVENTS' &&
		eventsLoading !== 'blocking' &&
		filteredRuns.length > 0;

	return (
		<View style={{flex: 1}}>
			<ModalCreateChoice
				isOpen={createChoiceVisible}
				onClose={() => setCreateChoiceVisible(false)}
				onChoose={openCreate}
				variant={activeFilter === 'MODULE' ? 'MODULE' : 'CYCLE'}
			/>
			<CycleFilterBar
				active={activeFilter}
				onChange={key => {
					// Arrivée sur les événements : loader tout de suite, la liste
					// (lourde) n'est rendue qu'à la réponse de la box.
					if (key === 'EVENTS' && activeFilter !== 'EVENTS') {
						setEventsLoading('blocking');
					}
					setActiveFilter(key);
				}}
				counts={counts}
			/>
			<View style={{paddingBottom: 4}}>{renderFixedFilters()}</View>
			{showRunList ? (
				// FlashList : seules les cartes proches de l'écran sont montées
				// et les cellules sont recyclées. Dans la ScrollView, chaque
				// page chargée ajoutait 20 cartes jamais démontées (mémoire en
				// hausse continue au scroll).
				<FlashList
					style={{flex: 1}}
					data={filteredRuns}
					keyExtractor={run => run.runId}
					renderItem={({item}) => (
						<RunListItem
							run={item}
							expanded={expandedRunId === item.runId}
							onToggle={toggleRun}
							nameOf={nameOf}
						/>
					)}
					extraData={expandedRunId}
					ItemSeparatorComponent={RunSeparator}
					contentContainerStyle={{paddingTop: 4, paddingBottom: 16}}
					onEndReached={loadMoreRuns}
					onEndReachedThreshold={0.5}
					drawDistance={500}
					refreshing={refreshing}
					onRefresh={onRefresh}
					ListFooterComponent={
						hasMoreRuns ? (
							<ActivityIndicator
								size="small"
								color={RUN_FILTERS.find(f => f.key === runFilter)?.color}
								style={{marginVertical: 12}}
							/>
						) : null
					}
				/>
			) : (
			<ScrollView
				scrollEnabled={true}
				contentContainerStyle={{paddingBottom: 16}}
				scrollEventThrottle={200}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						style={{
							alignItems: 'flex-start',
							justifyContent: 'flex-start',
							alignSelf: 'flex-start'
						}}
					/>
				}>
				<View style={{gap: 8, marginVertical: 4, alignSelf: 'stretch'}}>
					{renderList()}
				</View>
			</ScrollView>
			)}
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	cycles: state.root_cycle.cycles,
	groups: state.root_cycle.groups,
	status: state.root_cycle.status,
	events: state.root_cycle.events,
	connected: state.status.connected,
	isBoxConnected: state.status.isBoxConnected
});

export default connect(mapStateToProps, {
	loadCycles,
	loadGroups,
	loadEvents,
	executeCycle,
	loadActuators
})(Cycle);
