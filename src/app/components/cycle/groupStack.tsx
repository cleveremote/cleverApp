import React from 'react';
import {Text, View} from 'react-native';
import {OrientationType} from 'react-native-orientation-locker';
import {connect} from 'react-redux';
import SensorStatus from './CycleStatus';
import {MenuCycle} from './cycleStack';
import CycleStack from './cycleStack';

// The group/cycle configuration may expose `iconColor` either as a plain color
// string or as the `{base, icon}` object expected by CycleStack/MenuCycle.
// Normalize it so both forms render correctly.
const normalizeStyle = (style: any) => {
	if (!style) {
		return {
			bgColor: '#a5f3fc',
			fontColor: '#60a5fa',
			iconColor: {base: '#60a5fa', icon: '#60a5fa'}
		};
	}
	const ic = style.iconColor;
	if (ic && typeof ic === 'object') {
		return style;
	}
	return {...style, iconColor: {base: ic, icon: ic}};
};

export function GroupStack({
	groupData,
	cycles,
	navigation,
	orientation,
	closeSibillings,
	current,
	onSwitch,
	onSkip,
	onExecute,
	status
}: Readonly<{
	groupData: any;
	cycles: any[];
	navigation: any;
	orientation: OrientationType;
	closeSibillings: Function;
	current: string | undefined;
	onSwitch: (item: any, value: boolean, type: string, executableType?: string) => void | Promise<void>;
	onSkip: (sequenceId: any, executableType?: string) => void;
	onExecute: (id: string, ms: number, executableType?: string) => void;
	status?: any;
}>) {
	const groupStyle = normalizeStyle(groupData.style);
	const fontColor = groupStyle.fontColor;
	const iconColorSwitch = groupStyle.iconColor.base;
	const bgColor = groupStyle.bgColor;

	const groupWithStyle = {...groupData, style: groupStyle};

	// Les cycles enfants d'un groupe sont désormais référencés par le groupe
	// lui-même via `childCycles` ({cycleId, config:{order,…}}). On résout chaque
	// `cycleId` contre la liste plate des cycles, on trie par `config.order`
	// (tri stable : les ordres égaux gardent leur ordre d'insertion) et on écarte
	// les références non résolues ou supprimées.
	const groupCycles = [...(groupData.childCycles || [])]
		.sort((a: any, b: any) => (a.config?.order ?? 0) - (b.config?.order ?? 0))
		.map((child: any) =>
			(cycles || []).find((c: any) => c.id === child.cycleId)
		)
		.filter((cycle: any) => cycle && !cycle.delete)
		.map((cycle: any) => ({...cycle, style: normalizeStyle(cycle.style)}));

	return (
		<View>
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: bgColor,
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22,
					height: 45,
					marginHorizontal: 4,
					marginTop: 4,
					flex: 1
				}}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						flex: 1,
						marginHorizontal: 8
					}}>
					<View style={{flex: 2}}>
						<Text
							style={{
								fontWeight: 'bold',
								color: fontColor,
								fontSize: 15,
								marginLeft: 40
							}}
							numberOfLines={1}
							ellipsizeMode="middle">
							{groupData.name}
						</Text>
					</View>
					<SensorStatus
						cycleData={groupWithStyle}
						iconColorSwitch={iconColorSwitch}
						onSwitch={(value: boolean, type: string) =>
							onSwitch(groupData, value, type, "TASK")
						}
						closeSibillings={closeSibillings}
						onSkip={onSkip}
						navigation={navigation}
					/>
				</View>
			</View>

			<View style={{marginTop: -37, width: 60, marginLeft: 8}}>
				<MenuCycle
					navigation={navigation}
					cycleData={groupWithStyle}
					closeSibillings={closeSibillings}
					current={current}
					onExecute={onExecute.bind(null, groupData.id, 0, "TASK")}
					isGroup={true}
					status={
						status?.find((x: any) => x?.id === groupData.id)?.status
					}
				/>
			</View>

			{groupCycles.map((cycle: any, index: number) => (
				<View
					key={'group_cycle_' + index}
					style={{marginLeft: 20, marginTop: 8}}>
					<CycleStack
						cycleData={cycle}
						navigation={navigation}
						orientation={orientation}
						closeSibillings={closeSibillings}
						current={current}
						onSwitch={(value: boolean, type: string) =>
							onSwitch(cycle, value, type)
						}
						onSkip={onSkip}
						onExecute={onExecute}
					/>
				</View>
			))}
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(GroupStack);
