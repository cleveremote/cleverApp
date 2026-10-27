import React, {useEffect, useRef} from 'react';
import {LayoutChangeEvent, View} from 'react-native';
import {connect} from 'react-redux';
import {ScrollView, RefreshControl} from 'react-native-gesture-handler';
import Orientation, {OrientationType} from 'react-native-orientation-locker';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';
import {SensorStack} from '../../components/sensor/SensorStack';
import {loadSensors} from '../../../module/process/infrasctructure/store/actions/sensor';
export function Sensor(props: any) {
	const [activeMenu, setActiveMenu] = React.useState<string>();
	const [orientation, setOrientation] = React.useState<OrientationType>(
		OrientationType.UNKNOWN
	);
	const [refreshing, setRefreshing] = React.useState<boolean>(false);
	const [collapsed, setCollapsed] = React.useState<string[]>([]);
	const scrollRef = useRef<any>(null);
	const scrollY = useRef(0);
	const viewportHeight = useRef(0);
	const listY = useRef(0);
	const groupY = useRef<Record<string, number>>({});
	// Bloc qui vient de s'agrandir (parent déplié → 'group_<id>', menu ouvert
	// → 'sensor_<id>') : on attend son nouveau layout pour le ramener dans la
	// zone visible.
	const pendingReveal = useRef<string | null>(null);

	useEffect(() => {
		props.navigation.setOptions({
			headerRight: () =>
				navigationHeader(
					() => {
						props.navigation.navigate('Settings', {
							screen: 'SensorSettingsMenu',
							params: null
						});
					},
					'times-circle',
					true
				),
			headerLeft: brandLogo
		});

		const initial = Orientation.getInitialOrientation();
		setOrientation(initial);
		Orientation.addOrientationListener(or => {
			setOrientation(or);
		});
	}, []);

	const closeSibillings = (isExpended: boolean, current?: string) => {
		if (isExpended) {
			const sensor = (props.sensors || []).find(
				(x: any) => x.name === current
			);
			pendingReveal.current = sensor ? `sensor_${sensor.id}` : null;
			setActiveMenu(current);
		} else {
			setActiveMenu(undefined);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		props.loadSensors().then((response: {configuration: string}) => {
			setRefreshing(false);
		});
	};

	const visibleSensors = (props.sensors || []).filter(
		(x: any) => !x.delete && x.display !== false
	);
	// Le parentId suffit à identifier un enfant (isChild n'est pas toujours
	// renvoyé). Un enfant dont le parent n'est pas affiché reste au premier
	// niveau.
	const getParentId = (sensor: any) => sensor.parentId ?? sensor.parent?.id;
	const isNestedChild = (sensor: any) => {
		const parentId = getParentId(sensor);
		return (
			parentId != null &&
			`${parentId}` !== `${sensor.id}` &&
			visibleSensors.some((x: any) => `${x.id}` === `${parentId}`)
		);
	};
	const toggleCollapsed = (id: string) => {
		pendingReveal.current = collapsed.includes(id) ? `group_${id}` : null;
		setCollapsed(prev =>
			prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
		);
	};

	// `top` est la position du bloc dans le contenu du ScrollView.
	const reveal = (key: string, top: number, height: number) => {
		if (pendingReveal.current !== key) {
			return;
		}
		pendingReveal.current = null;
		const bottom = top + height;
		const visibleBottom = scrollY.current + viewportHeight.current;
		if (bottom > visibleBottom) {
			// Montre le bas du bloc sans faire sortir son haut de l'écran.
			scrollRef.current?.scrollTo({
				y: Math.min(top, bottom - viewportHeight.current + 8),
				animated: true
			});
		}
	};
	const onGroupLayout = (id: string, e: LayoutChangeEvent) => {
		const {y, height} = e.nativeEvent.layout;
		groupY.current[id] = y;
		reveal(`group_${id}`, listY.current + y, height);
	};
	// Position d'une carte relative à son groupe.
	const onSensorLayout = (
		id: string,
		groupId: string,
		e: LayoutChangeEvent
	) => {
		if (pendingReveal.current !== `sensor_${id}`) {
			return;
		}
		const {y, height} = e.nativeEvent.layout;
		// Le menu précédent se referme dans la même passe de layout : on attend
		// une frame pour que groupY soit à jour.
		requestAnimationFrame(() =>
			reveal(
				`sensor_${id}`,
				listY.current + (groupY.current[groupId] ?? 0) + y,
				height
			)
		);
	};
	const rootSensors = visibleSensors.filter((x: any) => !isNestedChild(x));
	const getChildren = (parent: any) =>
		visibleSensors.filter(
			(x: any) =>
				isNestedChild(x) && `${getParentId(x)}` === `${parent.id}`
		);

	return (
		<ScrollView
			ref={scrollRef}
			scrollEnabled={true}
			scrollEventThrottle={16}
			onScroll={e => {
				scrollY.current = e.nativeEvent.contentOffset.y;
			}}
			onLayout={e => {
				viewportHeight.current = e.nativeEvent.layout.height;
			}}
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
			<View
				style={{gap: 8, marginVertical: 4, alignSelf: 'stretch'}}
				onLayout={e => {
					listY.current = e.nativeEvent.layout.y;
				}}>
				{rootSensors.map((sensor: any) => {
					const children = getChildren(sensor);
					const isExpanded = !collapsed.includes(`${sensor.id}`);
					return (
						<View
							key={'sensor_' + sensor.id}
							onLayout={e => onGroupLayout(`${sensor.id}`, e)}>
							<View
								onLayout={e =>
									onSensorLayout(
										`${sensor.id}`,
										`${sensor.id}`,
										e
									)
								}>
								<SensorStack
									cycleData={sensor}
									navigation={props.navigation}
									current={activeMenu}
									closeSibillings={closeSibillings}
									isParent={children.length > 0}
									isExpanded={isExpanded}
									onToggleExpand={() =>
										toggleCollapsed(`${sensor.id}`)
									}
								/>
							</View>
							{isExpanded &&
								children.map((child: any) => (
									<View
										key={'sensor_' + child.id}
										style={{marginLeft: 20, marginTop: 8}}
										onLayout={e =>
											onSensorLayout(
												`${child.id}`,
												`${sensor.id}`,
												e
											)
										}>
										<SensorStack
											cycleData={child}
											navigation={props.navigation}
											current={activeMenu}
											closeSibillings={closeSibillings}
										/>
									</View>
								))}
						</View>
					);
				})}
			</View>
		</ScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	isBoxConnected: state.status.isBoxConnected,
	isServerConnected: state.status.isServerConnected
});

export default connect(mapStateToProps, {
	loadSensors
})(Sensor);
