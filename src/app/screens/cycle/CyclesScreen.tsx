import React, {useEffect, useRef} from 'react';
import {connect} from 'react-redux';
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
import {AppState, View} from 'react-native';
import {
	executeCycle,
	listenerEvents,
	loadCycles,
	loadGroups
} from '../../../module/process/infrasctructure/store/actions/cycle';

const IN_PROCESS = 'IN_PROCCESS';

const filterFromTypeFilter = (typeFilter?: string): FilterKey => {
	if (typeFilter === 'MODULE') {
		return 'MODULE';
	}
	if (typeFilter === 'FERTIGATION') {
		return 'FERTIGATION';
	}
	return 'CYCLE';
};

export function Cycle(props: any) {
	const [activeMenu, setActiveMenu] = React.useState<string>();
	const [activeFilter, setActiveFilter] = React.useState<FilterKey>(
		filterFromTypeFilter(props.route?.params?.typeFilter)
	);
	const [orientation, setOrientation] = React.useState<OrientationType>(
		OrientationType.UNKNOWN
	);
	const [refreshing, setRefreshing] = React.useState<boolean>(false);
	const [isLoading, setIsLoading] = React.useState<boolean>(false);

	const appState = useRef(AppState.currentState);

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

	// The "+" header opens creation directly for the currently selected
	// filter: a plain cycle, a GROUP fertigation, or a MODULE. Keyed on
	// activeFilter so the handler always targets the visible segment.
	const openCreate = (params: any) => {
		props.navigation.navigate('Settings', {
			screen: 'CycleSettingsMenu',
			params
		});
	};

	useEffect(() => {
		const onCreate = () => {
			if (activeFilter === 'FERTIGATION') {
				openCreate({isGroup: true});
			} else if (activeFilter === 'MODULE') {
				openCreate({type: 'MODULE'});
			} else {
				openCreate({});
			}
		};
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
		await Promise.all([props.loadCycles(), props.loadGroups()]);
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
		(x: any) => x.type !== 'MODULE' && x.type !== 'GROUP'
	);
	const moduleItems = cycles
		.filter((x: any) => !x.delete && x.display !== false)
		.filter((x: any) => x.type === 'MODULE');
	const groupItems = groups.filter(
		(x: any) => !x.delete && x.display !== false
	);

	const counts = {
		CYCLE: cycleItems.filter(
			(x: any) => statusOf(x.id) === IN_PROCESS
		).length,
		FERTIGATION: groupItems.filter(
			(x: any) => statusOf(x.id) === IN_PROCESS
		).length,
		MODULE: moduleItems.filter(
			(x: any) => statusOf(x.id) === IN_PROCESS
		).length
	};

	const renderList = () => {
		if (activeFilter === 'FERTIGATION') {
			return groupItems.map((group: any) => (
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
					onExecute={onGroupExecute}
				/>
			));
		}

		const list = activeFilter === 'MODULE' ? moduleItems : cycleItems;
		return list.map((cycle: any) => (
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
				onExecute={onExecute}
			/>
		));
	};

	return (
		<View style={{flex: 1}}>
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
	isLoading: state.root_cycle.isLoading,
	connected: state.status.connected,
	isBoxConnected: state.status.isBoxConnected
});

export default connect(mapStateToProps, {
	loadCycles,
	loadGroups,
	executeCycle
})(Cycle);
