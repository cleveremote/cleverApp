import React, {useEffect, useRef} from 'react';
import {connect, useSelector} from 'react-redux';
import {useForm} from 'react-hook-form';
import CycleStack from '../../components/cycle/cycleStack';
import GroupStack from '../../components/cycle/groupStack';
import CycleFilterBar, {FilterKey} from '../../components/cycle/CycleFilterBar';
import {ScrollView, RefreshControl} from 'react-native-gesture-handler';
import Orientation, {OrientationType} from 'react-native-orientation-locker';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import Spinner from 'react-native-loading-spinner-overlay';
import {styles} from '../../styles/cycleStyles';
import {AppState, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
	executeCycle,
	listenerEvents,
	loadCycles,
	loadEvents,
	loadGroups
} from '../../../module/process/infrasctructure/store/actions/cycle';
import {RunCard} from '../../components/cycle/RunCard';
import {ModalCreateChoice} from '../../components/cycle/ModalCreateChoice';
import {SelectForm} from '../../components/common/FormComponents';
import {DateRangePickerForm} from '../../components/common/DateRangePickerForm';
import {TimeZoneNotice} from '../../components/common/TimeZoneNotice';
import {BoxFormStyle} from '../../styles/components/common/boxForm';
import {endOfDayIn, startOfDayIn} from '../../../services/time';
import {selectBoxTimeZone} from '../../../module/process/infrasctructure/store/models/boxSettings';
import {CycleRun} from '../../../module/process/infrasctructure/store/models/cycleHistory';
import {isModuleType} from '../../data/cycleTypes';
import {loadActuators} from '../../../module/process/infrasctructure/store/actions/actuator';

const IN_PROCESS = 'IN_PROCCESS';
const ALL_DEVICES = 'ALL';

type EventCriteria = {
	deviceId: string;
	startDate: Date;
	endDate: Date;
};

const runDate = (run: CycleRun) =>
	new Date(run.startedAt ?? run.requestedAt).getTime() || 0;

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
	const {
		control,
		formState: {errors},
		getValues
	} = useForm<any>({
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

	// Période + cycle (sans deviceId : tous les cycles).
	const loadRecentEvents = () => {
		const c = getValues() as EventCriteria;
		props.loadEvents({
			...(c.deviceId !== ALL_DEVICES && {deviceId: c.deviceId}),
			startDate: c.startDate,
			endDate: c.endDate
		});
	};
	// Laisse le formulaire enregistrer la valeur avant de relancer la requête.
	const reloadEvents = () => setTimeout(loadRecentEvents, 0);

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
		return props.navigation.addListener('focus', loadRecentEvents);
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

		props.executeCycle(dto);
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
			activeFilter === 'EVENTS' && loadRecentEvents()
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
	const groupItems = groups.filter(
		(x: any) => !x.delete && x.display !== false
	);

	const counts = {
		CYCLE: [...groupItems, ...cycleItems].filter(
			(x: any) => statusOf(x.id) === IN_PROCESS
		).length,
		MODULE: moduleItems.filter(
			(x: any) => statusOf(x.id) === IN_PROCESS
		).length
	};

	const renderGroups = () =>
		groupItems.map((group: any) => (
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

	const runs: CycleRun[] = props.events ?? [];
	const recentRuns = [...runs].sort((a, b) => runDate(b) - runDate(a));

	const deviceOptions = [
		{label: t('cycle:events.allDevices'), value: ALL_DEVICES},
		...[...groupItems, ...cycleItems, ...moduleItems].map((x: any) => ({
			label: x.name ?? x.id,
			value: x.id
		}))
	];

	const renderEventCriteria = () => (
		<View style={BoxFormStyle.boxForm}>
			<SelectForm
				lstData={deviceOptions}
				control={control}
				errors={errors}
				name="deviceId"
				placeholder={t('cycle:events.device')}
				onValueChange={reloadEvents}
			/>
			<TimeZoneNotice kind="box" />
			<DateRangePickerForm
				control={control}
				startName="startDate"
				endName="endDate"
				timeZone={tz}
				placeholder={t('cycle:events.period')}
				onChange={reloadEvents}
			/>
		</View>
	);

	const nameOf = (id: string) => {
		const entity = [...cycles, ...groups].find((x: any) => x.id === id);
		if (entity?.name) return entity.name;
		for (const run of recentRuns) {
			const entry = run.timeline?.find(e => e.elementId === id);
			if (entry?.name) return entry.name;
		}
		return id;
	};

	const renderRecentEvents = () => {
		if (!recentRuns.length) {
			return props.isLoading ? null : (
				<Text style={{color: '#777', textAlign: 'center', marginTop: 24}}>
					{t('cycle:events.noRun')}
				</Text>
			);
		}
		return recentRuns.map(run => {
			const expanded = expandedRunId === run.runId;
			return (
				<RunCard
					key={run.runId}
					run={run}
					expanded={expanded}
					onToggle={() => setExpandedRunId(expanded ? null : run.runId)}
					nameOf={nameOf}
				/>
			);
		});
	};

	const renderList = () => {
		if (activeFilter === 'EVENTS') {
			return (
				<>
					{renderEventCriteria()}
					{renderRecentEvents()}
				</>
			);
		}
		const list = activeFilter === 'MODULE' ? moduleItems : cycleItems;
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
		return activeFilter === 'MODULE'
			? cycleCards
			: [...renderGroups(), ...cycleCards];
	};

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
				onChange={setActiveFilter}
				counts={counts}
			/>
			<ScrollView
				scrollEnabled={true}
				contentContainerStyle={{paddingBottom: 16}}
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
					<Spinner
						visible={props.isLoading}
						color="#32404e"
						textStyle={styles.spinnerTextStyle}
						animation="fade"
					/>
					{renderList()}
				</View>
			</ScrollView>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	cycles: state.root_cycle.cycles,
	groups: state.root_cycle.groups,
	status: state.root_cycle.status,
	events: state.root_cycle.events,
	isLoading: state.root_cycle.isLoading,
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
