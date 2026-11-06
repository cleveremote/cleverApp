import {ELEMENT_HEIGHT, ELEMENT_FONT_SIZE} from '../../styles/metrics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
	faCircleDot,
	faSyncAlt,
	IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { connect } from 'react-redux';
import { navigationHeader } from '../../components/common/navigationHeaders';
import { AppSwitch } from '../../components/common/AppSwitch';
import { hapticOptions } from '../../data/cycleTypes';
import {
	saveCycle,
	saveGroup
} from '../../../module/process/infrasctructure/store/actions/cycle';
import { saveSensor } from '../../../module/process/infrasctructure/store/actions/sensor';

type FilterKey = 'cycles' | 'sensors';

const SEGMENTS: { key: FilterKey; icon: IconDefinition }[] = [
	{ key: 'cycles', icon: faSyncAlt },
	{ key: 'sensors', icon: faCircleDot }
];

// Single "Manage display" screen for both cycles and sensors: a filter bar at
// the top (Cycles / Sensors) swaps the list below, just like the Cycles screen.
// The two lists are visually identical (a name + an on/off switch per row); only
// the underlying redux slice and save action differ. Toggles for both families
// are collected in one `displayMap` and each toggle is persisted immediately.
function DisplayManagerScreen(props: any) {
	const { t } = useTranslation('navigation');
	const [activeFilter, setActiveFilter] = useState<FilterKey>(
		props.route?.params?.kind || 'cycles'
	);

	// Build the displayable set for cycles: top-level cycles, modules, and groups
	// (fertigation), mirroring the Cycles screen. GROUP entities live in their
	// own redux slice and must be persisted with `saveGroup` instead of
	// `saveCycle`, so each item carries an `isGroup` flag.
	const buildCycleItems = () => {
		const cycles = (props.cycles || []).filter((x: any) => !x.delete);
		const groups = (props.groups || []).filter((x: any) => !x.delete);

		const cycleItems = cycles.filter(
			(x: any) =>
				!x.parentCycleId && x.type !== 'MODULE' && x.type !== 'GROUP'
		);
		const moduleItems = cycles.filter((x: any) => x.type === 'MODULE');

		return [
			...cycleItems.map((x: any) => ({
				entity: x,
				kind: 'cycles',
				isGroup: false
			})),
			...moduleItems.map((x: any) => ({
				entity: x,
				kind: 'cycles',
				isGroup: false
			})),
			...groups.map((x: any) => ({
				entity: x,
				kind: 'cycles',
				isGroup: true
			}))
		];
	};

	// Sensors: each child (parentId) is listed indented right under its parent,
	// like on the Sensors screen. A child whose parent is missing stays at the
	// top level.
	const getParentId = (sensor: any) => sensor.parentId ?? sensor.parent?.id;
	const buildSensorItems = () => {
		const sensors = (props.sensors || []).filter((x: any) => !x.delete);
		const parentOf = (sensor: any) => {
			const parentId = getParentId(sensor);
			if (parentId == null || `${parentId}` === `${sensor.id}`) {
				return undefined;
			}
			return sensors.find((x: any) => `${x.id}` === `${parentId}`);
		};
		const toItem = (x: any, parent?: any) => ({
			entity: x,
			kind: 'sensors',
			isGroup: false,
			parent
		});
		return sensors
			.filter((x: any) => !parentOf(x))
			.flatMap((root: any) => [
				toItem(root),
				...sensors
					.filter((x: any) => parentOf(x) === root)
					.map((x: any) => toItem(x, root))
			]);
	};

	const cycleItems = buildCycleItems();
	const sensorItems = buildSensorItems();
	const allItems = [...cycleItems, ...sensorItems];
	const visibleItems = activeFilter === 'sensors' ? sensorItems : cycleItems;

	// Persist a single entity to the correct slice depending on its kind.
	const saveItem = (entity: any, kind: string, isGroup: boolean) => {
		if (kind === 'sensors') {
			props.saveSensor(entity);
		} else if (isGroup) {
			props.saveGroup(entity);
		} else {
			props.saveCycle(entity);
		}
	};

	// An item is considered visible unless its `display` flag is explicitly
	// false, so legacy entities (no flag yet) show as ON by default.
	const buildInitial = () =>
		allItems.reduce((acc: Record<string, boolean>, { entity }: any) => {
			acc[entity.id] = entity.display !== false;
			return acc;
		}, {});

	const [displayMap, setDisplayMap] =
		useState<Record<string, boolean>>(buildInitial);

	// Toggle a single row: update the local map and persist that entity right
	// away to the correct slice. Hiding a parent sensor also hides its children
	// (which then stay locked off until the parent is shown again).
	const onToggle = (
		entity: any,
		kind: string,
		isGroup: boolean,
		value: boolean
	) => {
		const children =
			kind === 'sensors' && !value
				? sensorItems
						.filter((x: any) => x.parent?.id === entity.id)
						.map((x: any) => x.entity)
						.filter((x: any) => displayMap[x.id] !== false)
				: [];
		setDisplayMap(prev => {
			const next: Record<string, boolean> = {
				...prev,
				[entity.id]: value
			};
			children.forEach((x: any) => (next[x.id] = false));
			return next;
		});
		saveItem({ ...entity, display: value }, kind, isGroup);
		children.forEach((x: any) =>
			saveItem({ ...x, display: false }, kind, false)
		);
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => {
						props.navigation.goBack();
					},
					'arrow-alt-circle-left',
					false
				)
		});
	}, []);

	return (
		<View style={{ flex: 1 }}>
			<View style={styles.bar}>
				{SEGMENTS.map(({ key, icon }) => {
					const isActive = activeFilter === key;
					return (
						<Pressable
							key={key}
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								setActiveFilter(key);
							}}
							style={({ pressed }) => [
								styles.segment,
								isActive && styles.segmentActive,
								{ transform: [{ scale: pressed ? 0.98 : 1 }] }
							]}
						>
							<FontAwesomeIcon
								icon={icon}
								size={15}
								color={isActive ? 'white' : '#32404e'}
							/>
							<Text
								numberOfLines={1}
								style={[
									styles.label,
									isActive && styles.labelActive
								]}
							>
								{t(key)}
							</Text>
						</Pressable>
					);
				})}
			</View>
			<ScrollView style={{ alignSelf: 'stretch' }}>
				<View style={styles.card}>
					{visibleItems.map(
						(
							{ entity, kind, isGroup, parent }: any,
							index: number
						) => {
							const parentHidden =
								!!parent && displayMap[parent.id] === false;
							return (
								<View
									key={entity.id}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'space-between',
										height: ELEMENT_HEIGHT,
										paddingLeft: parent ? 40 : 16,
										paddingRight: 16,
										borderBottomColor: '#32404e',
										borderBottomWidth:
											index === visibleItems.length - 1
												? 0
												: 1
									}}
								>
									<Text
										style={{
											fontWeight: parent
												? 'normal'
												: 'bold',
											color: parentHidden
												? '#a0aab4'
												: '#32404e',
											fontSize: ELEMENT_FONT_SIZE,
											flex: 1,
											marginRight: 8,
											// 'left' = côté de début : RN l'inverse en RTL, alors que 'auto'
											// suit le contenu et laisse un nom latin à gauche en arabe.
											textAlign: 'left',
											textAlignVertical: 'center'
										}}
										numberOfLines={1}
									>
										{entity.name}
									</Text>
									<View
										style={{
											justifyContent: 'center',
											alignItems: 'center'
										}}
									>
										<AppSwitch
											value={
												parentHidden
													? false
													: displayMap[entity.id]
											}
											disabled={parentHidden}
											onValueChange={value =>
												onToggle(
													entity,
													kind,
													isGroup,
													value
												)
											}
										/>
									</View>
								</View>
							);
						}
					)}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 8
	},
	segment: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: ELEMENT_HEIGHT,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.18,
		shadowRadius: 2
	},
	segmentActive: {
		backgroundColor: '#32404e',
		borderColor: '#32404e'
	},
	label: {
		color: '#32404e',
		fontSize: ELEMENT_FONT_SIZE,
		fontWeight: 'bold'
	},
	labelActive: {
		color: 'white'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: 'white',
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	}
});

const mapStateToProps = (state: any) => ({
	cycles: state.root_cycle.cycles,
	groups: state.root_cycle.groups,
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, {
	saveCycle,
	saveGroup,
	saveSensor
})(DisplayManagerScreen);
