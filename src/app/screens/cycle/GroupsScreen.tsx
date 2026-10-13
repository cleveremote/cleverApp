import React, {useEffect, useRef} from 'react';
import {connect} from 'react-redux';
import GroupStack from '../../components/cycle/groupStack';
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
	loadGroups
} from '../../../module/process/infrasctructure/store/actions/cycle';
import {
	fakeFertigationCycles,
	fakeFertigationGroups
} from '../../data/fakeFertigation';

export function Groups(props: any) {
	const [activeMenu, setActiveMenu] = React.useState<string>();
	const [orientation, setOrientation] = React.useState<OrientationType>(
		OrientationType.UNKNOWN
	);
	const [refreshing, setRefreshing] = React.useState<boolean>(false);

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
			headerRight: () =>
				navigationHeader(
					() =>
						props.navigation.navigate('Settings', {
							screen: 'CycleSettingsMenu',
							// No id + isGroup → CycleSettingsScreen creates a blank
							// GROUP cycle (General / Priority / Cycles).
							params: {id: undefined, isGroup: true}
						}),
					'times-circle',
					true
				),
			headerLeft: () => brandLogo()
		});

		const initial = Orientation.getInitialOrientation();
		setOrientation(initial);
		Orientation.addOrientationListener(or => {
			setOrientation(or);
		});
	}, []);

	const closeSibillings = (isExpended: boolean, current?: string) => {
		if (isExpended) {
			setActiveMenu(current);
		} else {
			setActiveMenu(undefined);
		}
	};

	const onSwitch = async (itemData: any, value: any, type: string,executableType: string) => {
		const dto = {
			id: itemData.id,
			status: 'STOPPED',
			action: !value ? 'OFF' : 'ON',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: type, //'INIT',// 'QUEUED'
			duration: 0,
			executableType
		};

		props.executeCycle(dto);
	};

	//override function for setting custom execution time for all sequences.
	const onExecute = (id: string, ms: number,executableType: string) => {
		const dto = {
			id: id,
			status: 'STOPPED',
			action: 'ON',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'INIT', // 'QUEUED'
			duration: ms,
			executableType
		};
		props.executeCycle(dto);
	};

	const onSkip = (sequenceId: string,executableType: string) => {
		const dto = {
			id: sequenceId,
			status: 'STOPPED',
			action: 'OFF',
			function: 'FUNCTION',
			mode: 'MANUAL',
			type: 'SKIP', // 'QUEUED'
			duration: 0,
			executableType
		};
		props.executeCycle(dto);
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await props.loadGroups();
		setRefreshing(false);
	};

	// Fall back to fake data so the structure/visual can be validated without a
	// backend. As soon as the box returns real groups, those take precedence
	// (along with the real cycles they reference via `childCycles`).
	const usingFake = false;
	const groups = usingFake ? fakeFertigationGroups : props.groups;
	const cycles = usingFake ? fakeFertigationCycles : props.cycles;

	return (
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
				{groups
					?.filter((x: any) => !x.delete)
					?.map((group: any, index: number) => (
						<GroupStack
							key={'group_' + index}
							groupData={group}
							cycles={cycles}
							navigation={props.navigation}
							current={activeMenu}
							orientation={orientation}
							closeSibillings={closeSibillings}
							onSwitch={onSwitch}
							onSkip={onSkip}
							onExecute={onExecute}
						/>
					))}
			</View>
		</ScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	groups: state.root_cycle.groups,
	cycles: state.root_cycle.cycles,
	isLoading: state.root_cycle.isLoading,
	connected: state.status.connected,
	isBoxConnected: state.status.isBoxConnected
});

export default connect(mapStateToProps, {
	loadGroups,
	executeCycle
})(Groups);
