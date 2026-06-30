import React, {useEffect, useRef, useState} from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	useWindowDimensions
} from 'react-native';
import Svg, {
	Defs,
	LinearGradient,
	Stop,
	ClipPath,
	Path,
	Rect,
	Circle,
	Ellipse,
	Line,
	Polygon,
	G,
	Text as SvgText
} from 'react-native-svg';
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView
} from 'react-native-gesture-handler';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Orientation from 'react-native-orientation-locker';

// Source SVG aspect ratio (viewBox 832 × 230). The left edge (−9132) leaves
// room for branch-0's rotated manual valve, which sticks out to ≈ −9125.
const SVG_W = 832;
const SVG_H = 230;

// Turbine (débitmètre) rotation period — ms for a full turn.
const SPIN_MS = 1200;
// Length consumed by one water "dash" loop (dasharray 12 + gap 12).
const DASH_LOOP = 24;
// Length consumed by one fertigation "dash" loop (dasharray 10 + gap 10).
const FERT_DASH_LOOP = 20;
// How long (ms) a dash pattern takes to advance one loop.
const FLOW_MS = 1000;

// 6 collector branches (left → right). Geometry verbatim from the source SVG
// (lc-horizontal): branches at x = -88.367817 + i·47.30562, valve/electrovalve
// rotation centres step by ±23.652764 per branch.
const BRANCH_X0 = -88.367817;
const BRANCH_DX = 47.30562;
const MV_CX0 = -101.66175; // manual valve rotate(90) centre, branch 0
const MV_CY0 = 237.65609;
const MV_STEP = 23.652764;
const EV_CX0 = -60.820459; // electrovalve rotate(-90) centre, branch 0
const EV_CY0 = 237.27058;
// Branch label positions (verbatim x's from the SVG, y ≈ 266.7).
const LABEL_X = [
	-113.33341, -64.258621, -15.668352, 30.877975, 78.283279, 125.71944
];
const VALVES = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

// Black + blue pipe casing (always visible).
const Casing = ({
	d,
	w = 12,
	bw = 8
}: {
	d: string;
	w?: number;
	bw?: number;
}) => (
	<>
		<Path d={d} fill="none" stroke="#111111" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
		<Path d={d} fill="none" stroke="#1565c0" strokeWidth={bw} strokeLinecap="round" strokeLinejoin="round" />
	</>
);

// Animated dashed overlay = the visible "flowing water".
const Flow = ({
	d,
	offset,
	color = '#42a5f5',
	w = 6,
	dash = '12 12'
}: {
	d: string;
	offset: number;
	color?: string;
	w?: number;
	dash?: string;
}) => (
	<Path
		d={d}
		fill="none"
		stroke={color}
		strokeWidth={w}
		strokeLinecap="round"
		strokeLinejoin="round"
		strokeDasharray={dash}
		strokeDashoffset={offset}
	/>
);

// Manual gray valve body (drawn at x≈-100, rotated per branch).
const ManualValve = () => (
	<>
		<Line x1={-100} y1={231} x2={-100} y2={237} stroke="#111111" strokeWidth={4} strokeLinecap="round" />
		<Line x1={-99} y1={231} x2={-99} y2={237} stroke="#ffffff" strokeWidth={1} strokeLinecap="round" opacity={0.15} />
		<Rect x={-104} y={237} width={8} height={4} rx={1} fill="#444444" stroke="#333333" strokeWidth={0.6} />
		<Rect x={-104} y={241} width={8} height={18} rx={2} fill="#8896a0" stroke="#5a6470" strokeWidth={1.2} />
		<Rect x={-103} y={241} width={6} height={14} rx={1} fill="#c8cdd2" />
	</>
);

// Electrovalve body (drawn around x≈-38, rotated per branch). The little dot
// turns blue when the branch is energised.
const ElectroValve = ({active}: {active: boolean}) => (
	<>
		<Rect x={-49.51289} y={203.61209} width={4} height={12} rx={2} fill="#333333" stroke="#111111" strokeWidth={0.9} />
		<Rect x={-31.351238} y={203.72322} width={4} height={12} rx={2} fill="#333333" stroke="#111111" strokeWidth={0.9} />
		<Rect x={-44.432064} y={202.72322} width={12} height={14} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.3} />
		<Rect x={-42.432064} y={194.72322} width={8} height={8} rx={1} fill="#2a2a2a" stroke="#111111" strokeWidth={1} />
		<Line x1={-41.432064} y1={196.72322} x2={-35.432064} y2={196.72322} stroke="#555555" strokeWidth={0.8} />
		<Line x1={-41.432064} y1={198.72322} x2={-35.432064} y2={198.72322} stroke="#555555" strokeWidth={0.8} />
		<Line x1={-41.432064} y1={200.72322} x2={-35.432064} y2={200.72322} stroke="#555555" strokeWidth={0.8} />
		<Line x1={-38.432064} y1={202.72322} x2={-38.432064} y2={194.72322} stroke="#444444" strokeWidth={1.5} strokeLinecap="round" />
		<Rect x={-42.432064} y={205.72322} width={8} height={8} rx={1} fill="#333333" stroke="#555555" strokeWidth={0.6} />
		<Line x1={-44.432064} y1={209.72322} x2={-32.432064} y2={209.72322} stroke="#555555" strokeWidth={0.8} />
		<Circle cx={-38.432064} cy={186.72322} r={4} fill={active ? '#42a5f5' : '#888780'} stroke="#5f5e5a" strokeWidth={1} />
	</>
);

// Gray check valve (clapet anti-retour), flow arrow right→left.
const GrayClapet = () => (
	<>
		<Rect x={162} y={130} width={4} height={18} rx={2} fill="#888780" stroke="#555555" strokeWidth={0.9} />
		<Circle cx={164} cy={135} r={1.3} fill="#444444" />
		<Circle cx={164} cy={143} r={1.3} fill="#444444" />
		<Rect x={194} y={130} width={4} height={18} rx={2} fill="#888780" stroke="#555555" strokeWidth={0.9} />
		<Circle cx={196} cy={135} r={1.3} fill="#444444" />
		<Circle cx={196} cy={143} r={1.3} fill="#444444" />
		<Rect x={166} y={131} width={28} height={16} rx={3} fill="#d3d1c7" stroke="#555555" strokeWidth={1.3} />
		<Rect x={169} y={134} width={22} height={10} rx={2} fill="#b4b2a9" />
		<Line x1={189} y1={139} x2={175} y2={139} stroke="#333333" strokeWidth={1.5} strokeLinecap="round" />
		<Polygon points="180,136 180,142 175,139" fill="#333333" />
	</>
);

// Small inline gauge/valve symbol (manifold).
const SmallValve = () => (
	<>
		<Line x1={351.85712} y1={255.0518} x2={351.85712} y2={277.05179} stroke="#111111" strokeWidth={4} strokeLinecap="round" />
		<Rect x={347.85712} y={275.90891} width={8} height={18} rx={2} fill="#8896a0" stroke="#5a6470" strokeWidth={1.2} />
		<Rect x={348.85712} y={275.90891} width={6} height={14} rx={1} fill="#c8cdd2" />
		<Rect x={348.85712} y={273.90891} width={6} height={4} rx={1} fill="#444444" stroke="#333333" strokeWidth={0.6} />
	</>
);

export function FertigationScreen() {
	const {width, height} = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const navigation = useNavigation<any>();

	// Keep clear of the iPhone camera band / notch using the real per-side
	// safe-area insets — only the notch side needs the big margin; the other
	// side keeps a small breathing margin.
	const padLeft = Math.max(insets.left, 8);
	const padRight = Math.max(insets.right, 8);

	// This schematic is landscape-shaped: lock the screen to landscape while
	// it's focused, and release the lock when leaving.
	useFocusEffect(
		React.useCallback(() => {
			Orientation.lockToLandscape();
			return () => Orientation.unlockAllOrientations();
		}, [])
	);

	// Global play/pause: makes the whole circuit + every branch flow.
	const [running, setRunning] = useState(false);
	// Per-branch toggles (energise a single output).
	const [valves, setValves] = useState<boolean[]>(VALVES.map(() => false));
	const mainActive = running || valves.some(Boolean);

	// Separate fertilizer-injection animation (purple dashes on the
	// "Fertigation system" block), toggled by its own button.
	const [fertigationRunning, setFertigationRunning] = useState(false);
	const anyActive = mainActive || fertigationRunning;

	// rAF-driven elapsed time (ms) — the whole SVG re-renders each frame.
	const [elapsed, setElapsed] = useState(0);
	const accRef = useRef(0);

	useEffect(() => {
		if (!anyActive) {
			return;
		}
		let raf = 0;
		let last: number | null = null;
		const loop = (now: number) => {
			if (last !== null) {
				accRef.current += now - last;
			}
			last = now;
			setElapsed(accRef.current);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [anyActive]);

	// Dash offsets. A negative offset moves dashes toward the path END (the
	// drawn direction); a positive offset moves them toward the START.
	//   • Water rule: always right→left. So horizontal pipes drawn left→right
	//     use fStart; vertical/branch pipes drawn downward use fEnd (down/out).
	//   • Discharge pipe (return to well) is the exception: left→right → fEnd.
	const fEnd = -((elapsed / FLOW_MS) * DASH_LOOP) % DASH_LOOP;
	const fStart = ((elapsed / FLOW_MS) * DASH_LOOP) % DASH_LOOP;
	const rot = mainActive ? ((elapsed / SPIN_MS) * 360) % 360 : 0;
	// Fertigation injection: left line flows up (toward start, +), right line
	// flows down (toward end, −).
	const fertUp = ((elapsed / FLOW_MS) * FERT_DASH_LOOP) % FERT_DASH_LOOP;
	const fertDown = -fertUp;

	const toggleValve = (i: number) =>
		setValves(v => v.map((on, idx) => (idx === i ? !on : on)));

	// Fill the page minus the side safe-area: largest size that fits without
	// cropping. In landscape the width is the binding constraint, so the
	// schematic spans edge-to-edge between the notch margins.
	const fit = Math.min((width - padLeft - padRight) / SVG_W, height / SVG_H);
	const svgWidth = SVG_W * fit;
	const svgHeight = SVG_H * fit;

	// --- Pinch-to-zoom + pan + double-tap reset (bounded to [1, 5]×) --------
	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const tx = useSharedValue(0);
	const ty = useSharedValue(0);
	const savedTx = useSharedValue(0);
	const savedTy = useSharedValue(0);

	const pinch = Gesture.Pinch()
		.onUpdate(e => {
			scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 5);
		})
		.onEnd(() => {
			savedScale.value = scale.value;
			if (scale.value <= 1) {
				tx.value = withTiming(0);
				ty.value = withTiming(0);
				savedTx.value = 0;
				savedTy.value = 0;
			}
		});

	const pan = Gesture.Pan()
		.averageTouches(true)
		.onUpdate(e => {
			tx.value = savedTx.value + e.translationX;
			ty.value = savedTy.value + e.translationY;
		})
		.onEnd(() => {
			savedTx.value = tx.value;
			savedTy.value = ty.value;
		});

	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => {
			scale.value = withTiming(1);
			savedScale.value = 1;
			tx.value = withTiming(0);
			ty.value = withTiming(0);
			savedTx.value = 0;
			savedTy.value = 0;
		});

	const zoomGesture = Gesture.Exclusive(
		doubleTap,
		Gesture.Simultaneous(pinch, pan)
	);

	const zoomStyle = useAnimatedStyle(() => ({
		transform: [
			{translateX: tx.value},
			{translateY: ty.value},
			{scale: scale.value}
		]
	}));

	return (
		<GestureHandlerRootView style={styles.root}>
		<ScrollView contentContainerStyle={[styles.container, {paddingLeft: padLeft, paddingRight: padRight}]}>
			<GestureDetector gesture={zoomGesture}>
				<Animated.View style={[{width: svgWidth, height: svgHeight}, styles.zoomBox, zoomStyle]}>
			<Svg width={svgWidth} height={svgHeight} viewBox="-9132 -24405 832 230">
				<Defs>
					<LinearGradient id="cuveBody" x1="0%" y1="0%" x2="100%" y2="0%">
						<Stop offset="0%" stopColor="#888888" />
						<Stop offset="18%" stopColor="#C8C8C8" />
						<Stop offset="50%" stopColor="#E2E2E2" />
						<Stop offset="82%" stopColor="#C0C0C0" />
						<Stop offset="100%" stopColor="#868686" />
					</LinearGradient>
					<LinearGradient id="cuveWater" x1="0%" y1="0%" x2="0%" y2="100%">
						<Stop offset="0%" stopColor="#90C8E8" stopOpacity={0.55} />
						<Stop offset="100%" stopColor="#4A9CC0" stopOpacity={0.75} />
					</LinearGradient>
					<LinearGradient id="cuveCapTop" x1="0%" y1="0%" x2="100%" y2="0%">
						<Stop offset="0%" stopColor="#989898" />
						<Stop offset="45%" stopColor="#D8D8D8" />
						<Stop offset="100%" stopColor="#929292" />
					</LinearGradient>
					<ClipPath id="clip-disques">
						<Rect x={301} y={82} width={40} height={46} />
					</ClipPath>
					<ClipPath id="clip-turb">
						<Circle cx={609} cy={340} r={12} />
					</ClipPath>
				</Defs>

				{/* ===== Discharge-return pipe (vanne de décharge → puits) ===== */}
				{/* Drawn left→right then down: flow follows the draw direction */}
				{/* (fEnd) so water visibly returns toward the well. */}
				<Casing d="m -8674.9938,-24361.923 324.6011,1.871 -0.3694,34.355" bw={9} />
				{mainActive && (
					<Flow d="m -8674.7258,-24361.663 c 111.4449,0.524 215.9509,1.049 323.9263,1.573 l -1.0746,65.341" offset={fEnd} />
				)}

				{/* ===== Main collector pipe (filter → 6 branches) ===== */}
				<Casing d="m -9100.5462,-24326.528 283.2565,-0.128 167.962,-0.882 c 8.6667,-0.04 13,4.333 13,13 0,8.667 -4.3729,13.334 -13,13.334 -41.1446,-0.13 -31.5334,0.196 -72.6692,0.07 l -0.434,31.939" />
				{mainActive && (
					<>
						{/* Long horizontal run, drawn left→right → fStart (right→left flow) */}
						<Flow d="m -9100.1469,-24326.487 283.2565,-0.128 167.962,-0.882 c 8.6667,-0.05 13,4.333 13,13" offset={fStart} />
						{/* Down-junction, drawn top→bottom → fEnd (downward) */}
						<Flow d="m -8635.9375,-24314.812 c 0,8.667 -4.3729,13.334 -13,13.334 -41.1446,-0.13 -31.5334,0.196 -72.6692,0.07 l -0.434,31.939" offset={fEnd} />
					</>
				)}

				{/* ===== Buffer tank (cuve tampon) ===== */}
				<G transform="matrix(0.78020743,0,0,0.70252198,-9040.1909,-24440.426)">
					<Rect x={374.21512} y={231.1308} width={68.210014} height={99.453217} fill="url(#cuveBody)" stroke="#686868" strokeWidth={1.2152} />
					<Rect x={375.2182} y={260.69742} width={66.203842} height={69.232292} fill="url(#cuveWater)" />
					<Line x1={375.2182} y1={280.85739} x2={441.42206} y2={280.85739} stroke="#4890b8" strokeWidth={0.729121} opacity={0.8} />
					<Rect x={373.21204} y={246.17964} width={70.216194} height={3.2714875} rx={1.9225657} fill="#686868" stroke="#585858" strokeWidth={0.648108} />
					<Rect x={373.21204} y={311.60938} width={70.216194} height={3.2714875} rx={1.9225657} fill="#686868" stroke="#585858" strokeWidth={0.648108} />
					<Rect x={378.22748} y={231.7851} width={7.0216193} height={98.144623} rx={2.5634208} fill="#ffffff" opacity={0.13} />
					<Rect x={435.4035} y={231.7851} width={6.0185308} height={98.144623} rx={2.5634208} fill="#404040" opacity={0.15} />
					<Ellipse cx={408.32013} cy={231.1308} rx={34.105007} ry={7.1972723} fill="url(#cuveCapTop)" stroke="#686868" strokeWidth={1.2152} />
					<Ellipse cx={399.29233} cy={229.16789} rx={11.033974} ry={2.6171899} fill="#ffffff" opacity={0.22} />
					<Ellipse cx={408.32013} cy={330.58401} rx={34.105007} ry={7.1972723} fill="#9a9a9a" stroke="#686868" strokeWidth={1.2152} />
					<Ellipse cx={408.32013} cy={330.58401} rx={20.061769} ry={3.9257851} fill="#808080" stroke="#585858" strokeWidth={0.648108} />
				</G>

				{/* ===== Main electrovalve (centre) ===== */}
				<G transform="translate(-8908.4303,-24441.092)">
					<Rect x={233} y={107} width={4} height={12} rx={2} fill="#333333" stroke="#111111" strokeWidth={0.9} />
					<Rect x={249} y={107} width={4} height={12} rx={2} fill="#333333" stroke="#111111" strokeWidth={0.9} />
					<Rect x={237} y={106} width={12} height={14} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.3} />
					<Rect x={239} y={98} width={8} height={8} rx={1} fill="#2a2a2a" stroke="#111111" strokeWidth={1} />
					<Line x1={240} y1={100} x2={246} y2={100} stroke="#555555" strokeWidth={0.8} />
					<Line x1={240} y1={102} x2={246} y2={102} stroke="#555555" strokeWidth={0.8} />
					<Line x1={240} y1={104} x2={246} y2={104} stroke="#555555" strokeWidth={0.8} />
					<Line x1={243} y1={106} x2={243} y2={98} stroke="#444444" strokeWidth={1.5} strokeLinecap="round" />
					<Rect x={239} y={109} width={8} height={8} rx={1} fill="#333333" stroke="#555555" strokeWidth={0.6} />
					<Line x1={239} y1={113} x2={247} y2={113} stroke="#555555" strokeWidth={0.8} />
					<Circle cx={243} cy={91} r={4} fill={mainActive ? '#42a5f5' : '#888780'} stroke="#5f5e5a" strokeWidth={1} />
				</G>

				<SvgText x={-8496.0654} y={-24283.902} fontSize={9} fill="#444441" fontWeight="600" textAnchor="middle">VAL_1</SvgText>

				{/* ===== Check valves (clapets anti-retour) ===== */}
				<G transform="translate(-8975.6854,-24604.447)">
					<G transform="translate(126.67826,164.16409)">
						<GrayClapet />
					</G>
				</G>
				<G transform="translate(-8909.7603,-24440.337)">
					<Rect x={162} y={104} width={4} height={18} rx={2} fill="#c8a84a" stroke="#8a6e20" strokeWidth={0.9} />
					<Circle cx={164} cy={109} r={1.3} fill="#8a6e20" />
					<Circle cx={164} cy={117} r={1.3} fill="#8a6e20" />
					<Rect x={194} y={104} width={4} height={18} rx={2} fill="#c8a84a" stroke="#8a6e20" strokeWidth={0.9} />
					<Circle cx={196} cy={109} r={1.3} fill="#8a6e20" />
					<Circle cx={196} cy={117} r={1.3} fill="#8a6e20" />
					<Rect x={166} y={105} width={28} height={16} rx={3} fill="#c8a84a" stroke="#8a6e20" strokeWidth={1.3} />
					<Rect x={169} y={108} width={22} height={10} rx={2} fill="#e8c86a" />
					<Line x1={189} y1={113} x2={175} y2={113} stroke="#8a6e20" strokeWidth={1.5} strokeLinecap="round" />
					<Polygon points="180,116 175,113 180,110" fill="#8a6e20" />
				</G>
				<SvgText x={-8556.7852} y={-24339.807} fontSize={9} fill="#444441" fontWeight="600">VAL_1</SvgText>
				<SvgText x={-8655.5244} y={-24339.807} fontSize={9} fill="#444441" fontWeight="600">VAL_1</SvgText>

				{/* ===== Manometer ===== */}
				<G transform="matrix(-0.68399727,0,0,0.68119073,-8245.6769,-24344.611)">
					<Line x1={415} y1={85} x2={435} y2={85} stroke="#111111" strokeWidth={4} strokeLinecap="round" />
					<Rect x={433} y={82} width={5} height={6} rx={1.4619942} fill="#888780" stroke="#555555" strokeWidth={0.8} />
					<Circle cx={447} cy={85} r={12} fill="#d3d1c7" stroke="#555555" strokeWidth={1.5} />
					<Circle cx={447} cy={85} r={10} fill="#f1efe8" stroke="#888780" strokeWidth={0.8} />
					<Line x1={447} y1={76} x2={447} y2={78} stroke="#555555" strokeWidth={1} />
					<Line x1={447} y1={92} x2={447} y2={94} stroke="#555555" strokeWidth={1} />
					<Line x1={438} y1={85} x2={440} y2={85} stroke="#555555" strokeWidth={1} />
					<Line x1={454} y1={85} x2={456} y2={85} stroke="#555555" strokeWidth={1} />
					<Line x1={447} y1={85} x2={451} y2={79} stroke="#c0392b" strokeWidth={1.2} strokeLinecap="round" />
					<Circle cx={447} cy={85} r={1.5} fill="#555555" />
				</G>

				{/* ===== Manifold small valve ===== */}
				<G transform="translate(-8953.3885,-24473.346)">
					<G transform="rotate(-90 349.23241 177.8095)">
						<SmallValve />
					</G>
				</G>

				<Line x1={-8528.3457} y1={-24306.484} x2={-8528.3457} y2={-24278.846} stroke="#111111" strokeWidth={3.91849} />

				{/* ===== Orange discharge valve head ===== */}
				<G transform="translate(-8979.4581,-24458.491)">
					<G transform="scale(1,-1)">
						<Rect x={448.11252} y={-183.89992} width={6} height={5} rx={1} fill="#111111" stroke="#333333" strokeWidth={0.8} />
					</G>
					<G transform="matrix(1,0,0,-1,20.873887,256.1899)">
						<Rect x={418.23862} y={48.476139} width={24} height={24} rx={3} fill="#e87a00" stroke="#a85500" strokeWidth={1.5} />
						<Rect x={421.23862} y={51.476139} width={18} height={14} rx={2} fill="#f59500" stroke="#a85500" strokeWidth={0.8} />
						<Line x1={422.23862} y1={58.476139} x2={436.23862} y2={58.476139} stroke="#e87a00" strokeWidth={1} />
						<Circle cx={430.23862} cy={58.476139} r={3.5} fill="#c06000" stroke="#f59500" strokeWidth={0.8} />
						<Circle cx={430.23862} cy={42.476139} r={4} fill="#888780" stroke="#5f5e5a" strokeWidth={1} />
					</G>
				</G>

				{/* ===== Flow-sensor module on the collector ===== */}
				<G transform="matrix(0,0.76256204,-0.79191324,0,-8703.7128,-24246.994)">
					<Rect x={-116.69113} y={142.68326} width={24.343163} height={5.1770549} rx={2.5255291} fill="#5a6a7a" stroke="#3a4a5a" strokeWidth={1.0248} />
					<Rect x={-116.69113} y={164.16934} width={24.343163} height={5.1770549} rx={2.5255291} fill="#5a6a7a" stroke="#3a4a5a" strokeWidth={1.0248} />
					<G transform="matrix(1.5971234,0,0,0.69061831,57.6978,42.880648)">
						<Rect x={-111.56846} y={152.81554} width={20} height={22} rx={4.7438965} fill="#8a9aaa" stroke="#5a6a7a" strokeWidth={1.3} />
						<Rect x={-106.56846} y={157.81554} width={10} height={12} rx={2.3719482} fill="#3a4a5a" stroke="#2a3a4a" strokeWidth={0.8} />
						<Line x1={-106.56846} y1={160.81554} x2={-110.56846} y2={160.81554} stroke="#4a5a6a" strokeWidth={0.8} />
						<Line x1={-106.56846} y1={164.81554} x2={-110.56846} y2={164.81554} stroke="#4a5a6a" strokeWidth={0.8} />
						<Line x1={-96.568459} y1={160.81554} x2={-92.568459} y2={160.81554} stroke="#4a5a6a" strokeWidth={0.8} />
						<Line x1={-96.568459} y1={164.81554} x2={-92.568459} y2={164.81554} stroke="#4a5a6a" strokeWidth={0.8} />
						<Rect x={-110.56846} y={153.81554} width={18} height={3} rx={1.5812989} fill="#aabbcc" opacity={0.5} />
						<Rect x={-106.768} y={160.4095} width={10} height={7} rx={1.1859741} fill="#29aadd" stroke="#1a88bb" strokeWidth={1} />
					</G>
				</G>

				{/* ===== 6 collector branches + valve assemblies ===== */}
				<G transform="translate(-9016.4369,-24443.576)">
					<G transform="translate(14.552017,-81.776771)">
						{VALVES.map((name, i) => {
							const bx = BRANCH_X0 + i * BRANCH_DX;
							const mvCx = MV_CX0 + i * MV_STEP;
							const mvCy = MV_CY0 + i * MV_STEP;
							const evCx = EV_CX0 + i * MV_STEP;
							const evCy = EV_CY0 - i * MV_STEP;
							const active = running || valves[i];
							return (
								<React.Fragment key={name}>
									<Casing d={`m ${bx},225.65199 v 94`} bw={9} />
									{active && (
										<Flow d={`m ${bx},228.65199 v 94`} offset={fEnd} />
									)}
									<G transform={`rotate(90 ${mvCx} ${mvCy})`}>
										<ManualValve />
									</G>
									<G transform={`rotate(-90 ${evCx} ${evCy})`}>
										<ElectroValve active={active} />
									</G>
									<SvgText x={LABEL_X[i]} y={266.7} fontSize={9} fill="#444441" fontWeight="600" textAnchor="middle">
										{name}
									</SvgText>
								</React.Fragment>
							);
						})}
					</G>
				</G>

				{/* ===== Right-side sand filter tank ===== */}
				<G transform="translate(-8913.2027,-24498.175)">
					<Rect x={506.71451} y={176.75388} width={14.587835} height={130.2468} rx={3} fill="#d3d1c7" stroke="#888780" strokeWidth={0.772065} />
					<Rect x={569.92841} y={176.75388} width={14.587835} height={130.2468} rx={3} fill="#b4b2a9" stroke="#888780" strokeWidth={0.772065} />
					<Rect x={506.71451} y={305.97913} width={77.801788} height={3.0646305} rx={2} fill="#888780" />
					<Line x1={506.71451} y1={194.63087} x2={584.51624} y2={194.63087} stroke="#888780" strokeWidth={0.965081} />
					<Line x1={506.71451} y1={220.16946} x2={584.51624} y2={220.16946} stroke="#888780" strokeWidth={1.28677} />
					<Line x1={506.71451} y1={242.64342} x2={584.51624} y2={242.64342} stroke="#888780" strokeWidth={0.965081} />
					<Line x1={506.71451} y1={265.1174} x2={584.51624} y2={265.1174} stroke="#888780" strokeWidth={0.965081} />
					<Line x1={506.71451} y1={286.56979} x2={584.51624} y2={286.56979} stroke="#888780" strokeWidth={0.965081} />
					<Rect x={521.30231} y={176.75388} width={48.626118} height={129.22525} fill="#e6f1fb" />
					<Rect x={521.30231} y={202.66301} width={48.626118} height={103.3161} fill="#85b7eb" opacity={0.45} />
					<Line x1={521.30231} y1={251.83733} x2={569.92841} y2={251.83733} stroke="#185fa5" strokeWidth={0.51471} strokeDasharray="4 3" />
					<Rect x={506.71451} y={173.68922} width={77.801788} height={4.086174} rx={3} fill="#888780" stroke="#5f5e5a" strokeWidth={0.643387} />
				</G>

				{/* ===== Feed to the sand filter ===== */}
				<G transform="translate(-8979.4581,-24442.977)">
					<Path d="m 421.74839,127.86258 191.82693,0.37955 -0.3694,46.28891 M 423.74839,129.86258" fill="none" stroke="#111111" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
					<Path d="m 421.74839,127.86258 191.82693,0.37955 -0.3694,46.28891 M 423.74839,129.86258" fill="none" stroke="#1565c0" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
				</G>
				{mainActive && (
					<G transform="translate(-8979.4574,-24442.879)">
						{/* Horizontal feed drawn left→right → fStart (right→left flow) */}
						<Flow d="m 421.74839,127.86258 191.82693,0.37955 -0.3694,46.28891 M 423.74839,129.86258" offset={fStart} />
					</G>
				)}

				{/* ===== Débitmètre with spinning turbine ===== */}
				<G transform="matrix(0.71637209,0,0,0.65281432,-8802.2983,-24438.856)">
					<Rect x={601} y={262} width={16} height={5} rx={2.7918453} fill="#8896a0" stroke="#5a6470" strokeWidth={1} />
					<Rect x={597} y={266} width={24} height={56} rx={5.5836906} fill="#c8cdd2" stroke="#6a7480" strokeWidth={1.8} />
					<Line x1={599} y1={275} x2={619} y2={275} stroke="#9aa4ae" strokeWidth={0.9} />
					<Line x1={599} y1={283} x2={619} y2={283} stroke="#e0e4e8" strokeWidth={0.6} opacity={0.8} />
					<Line x1={599} y1={291} x2={619} y2={291} stroke="#9aa4ae" strokeWidth={0.9} />
					<Line x1={599} y1={299} x2={619} y2={299} stroke="#e0e4e8" strokeWidth={0.6} opacity={0.8} />
					<Line x1={599} y1={307} x2={619} y2={307} stroke="#9aa4ae" strokeWidth={0.9} />
					<Line x1={599} y1={315} x2={619} y2={315} stroke="#e0e4e8" strokeWidth={0.6} opacity={0.8} />
					<Line x1={597} y1={321} x2={621} y2={321} stroke="#5a6470" strokeWidth={1.5} />
					<Rect x={594} y={321} width={30} height={36} rx={6.9796128} fill="#c8cdd2" stroke="#6a7480" strokeWidth={1.8} />
					<Line x1={596} y1={329} x2={622} y2={329} stroke="#9aa4ae" strokeWidth={0.9} />
					<Line x1={596} y1={349} x2={622} y2={349} stroke="#e0e4e8" strokeWidth={0.6} opacity={0.8} />
					<Circle cx={609} cy={340} r={13} fill="#8896a0" stroke="#5a6470" strokeWidth={1.5} />
					<Circle cx={609} cy={340} r={10} fill="#3c4248" stroke="#5a6470" strokeWidth={1} />
					<G clipPath="url(#clip-turb)">
						<G transform={`rotate(${rot} 609 340)`}>
							<Line x1={609} y1={330} x2={609} y2={350} stroke="#c8cdd2" strokeWidth={2.5} strokeLinecap="round" />
							<Line x1={599} y1={340} x2={619} y2={340} stroke="#c8cdd2" strokeWidth={2.5} strokeLinecap="round" />
							<Line x1={602} y1={333} x2={616} y2={347} stroke="#9aa4ae" strokeWidth={1.8} strokeLinecap="round" />
							<Line x1={616} y1={333} x2={602} y2={347} stroke="#9aa4ae" strokeWidth={1.8} strokeLinecap="round" />
						</G>
					</G>
					<Circle cx={609} cy={340} r={3.5} fill="#6a7480" stroke="#c8cdd2" strokeWidth={0.8} />
				</G>

				{/* ===== Manifold small valves ===== */}
				<G transform="rotate(180 -4105.8051 -12027.937)">
					<SmallValve />
				</G>
				<G transform="rotate(180 -4135.2253 -12027.937)">
					<SmallValve />
				</G>

				<G transform="scale(1,-1)">
					<Rect x={-8532.959} y={24305.975} width={9.2277231} height={15.768848} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.23115} />
				</G>
				<Rect x={-8448.5596} y={-24322.793} width={9.2277231} height={15.768848} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.23115} />

				{/* ===== Air-release valve (ventouse purgeur d'air) ===== */}
				<G transform="translate(-8984.9063,-24419.666)">
					<Line x1={541.11615} y1={110.88829} x2={541.11615} y2={98.88829} stroke="#111111" strokeWidth={5} />
					<G transform="translate(-6.657003,-10.290128)">
						<G transform="translate(213.75093,-132.00639)">
							<Rect x={330.05243} y={212.4586} width={7.6278253} height={4.4858594} rx={2.2883477} fill="#888780" stroke="#555555" strokeWidth={0.755175} />
							<Rect x={331.578} y={207.97275} width={4.5766954} height={5.9811459} rx={1.525565} fill="#555555" />
							<G transform="rotate(90)">
								<Rect x={216.96866} y={-339.9686} width={20.93401} height={12.20452} rx={2.2429297} fill="#d3d1c7" stroke="#555555" strokeWidth={0.981727} />
								<Rect x={219.21158} y={-337.68027} width={16.448151} height={7.6278253} rx={1.4952865} fill="#b4b2a9" />
								<Rect x={237.90266} y={-340.73138} width={2.9905729} height={13.730085} rx={1.4952865} fill="#888780" stroke="#555555" strokeWidth={0.679657} />
								<Ellipse cx={239.39795} cy={-333.86633} rx={0.97193617} ry={0.99161726} fill="#444444" />
							</G>
							<G transform="matrix(0.76278254,0,0,0.74764323,77.659967,60.87415)">
								<G transform="translate(-0.22656806,4.9844974)">
									<Line x1={336.11047} y1={223} x2={336.11047} y2={211} stroke="#333333" strokeWidth={1.5} strokeLinecap="round" />
									<G transform="rotate(90 366.05524 96.055237)">
										<Polygon points="484,129 479,126 484,123" fill="#333333" />
									</G>
								</G>
							</G>
						</G>
					</G>
				</G>

				{/* ===== Pressostat (orange) + top inlet stub ===== */}
				<G transform="translate(-8864.3621,-24442.907)">
					<Line x1={174.49149} y1={110.86439} x2={174.49149} y2={85.152786} stroke="#111111" strokeWidth={2.71816} strokeLinecap="round" />
					<Rect x={171.16855} y={61.098408} width={5.9070687} height={8.2294397} rx={1} fill="#111111" stroke="#333333" strokeWidth={1.01836} />
					<Rect x={162.30795} y={61.098408} width={23.628275} height={39.501312} rx={3} fill="#e87a00" stroke="#a85500" strokeWidth={1.90942} />
					<Rect x={165.26147} y={66.036072} width={17.721207} height={23.042433} rx={2} fill="#f59500" stroke="#a85500" strokeWidth={1.01836} />
					<G transform="matrix(0.98451147,0,0,1.645888,-40.501416,31.472424)">
						<Polygon points="225,28 218,35 211,28" fill="#e87a00" stroke="#a85500" strokeWidth={0.8} />
					</G>
					<Line x1={167.2305} y1={66.036072} x2={181.01367} y2={66.036072} stroke="#a85500" strokeWidth={1.52754} />
					<Line x1={174.12209} y1={61.733528} x2={174.12209} y2={55.960659} stroke="#a85500" strokeWidth={1.80214} strokeLinecap="round" />
					<Rect x={169.19952} y={51.48983} width={9.8451147} height={8.2294397} rx={2} fill="#b4b2a9" stroke="#888780" strokeWidth={1.273} />
					<G transform="rotate(90)">
						<Rect x={75.62323} y={-194.55797} width={9.8451147} height={8.2294397} rx={2} fill="#f59500" stroke="#a85500" strokeWidth={1.273} />
					</G>
					<G transform="scale(1,-1)">
						<Rect x={169.95392} y={-124.67183} width={9.2277231} height={15.768848} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.23115} />
					</G>
				</G>

				{/* ===== Black disc filter ===== */}
				<G transform="translate(-8862.595,-24659.363)">
					<G transform="translate(-51.292603,215.53447)">
						<Rect x={301} y={80} width={40} height={46} rx={4} fill="#1a1a1a" stroke="#111111" strokeWidth={1.8} />
						<G clipPath="url(#clip-disques)">
							{[87, 94, 101, 108, 115, 122].map(y => (
								<Line key={`disc-${y}`} x1={301} y1={y} x2={341} y2={y} stroke="#6a7480" strokeWidth={1} />
							))}
						</G>
						<Rect x={303} y={82} width={4} height={42} rx={2} fill="#ffffff" opacity={0.07} />
						<Rect x={306} y={73} width={30} height={9} rx={3} fill="#2a2a2a" stroke="#111111" strokeWidth={1.2} />
						<Rect x={312} y={67} width={18} height={8} rx={2} fill="#3a3a3a" stroke="#111111" strokeWidth={1} />
						<Rect x={304} y={126} width={34} height={32} rx={4} fill="#222222" stroke="#111111" strokeWidth={1.8} />
						<Rect x={306} y={128} width={4} height={28} rx={2} fill="#ffffff" opacity={0.06} />
						<Rect x={311} y={156} width={20} height={7} rx={3} fill="#c8a84a" stroke="#8a6e20" strokeWidth={1.2} />
						<Line x1={316} y1={157} x2={316} y2={162} stroke="#8a6e20" strokeWidth={0.8} />
						<Line x1={321} y1={157} x2={321} y2={162} stroke="#8a6e20" strokeWidth={0.8} />
						<Line x1={326} y1={157} x2={326} y2={162} stroke="#8a6e20" strokeWidth={0.8} />
					</G>
					<G transform="translate(-33.708339,-1.5501007)">
						<Rect x={320.5274} y={340.01654} width={16} height={12} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.2} />
						<Rect x={335.52747} y={338.01654} width={6} height={16} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1} />
					</G>
					<G transform="matrix(-1,0,0,1,573.12319,-1.5501007)">
						<Rect x={320.5274} y={340.01654} width={16} height={12} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1.2} />
						<Rect x={335.52747} y={338.01654} width={6} height={16} rx={2} fill="#1a1a1a" stroke="#111111" strokeWidth={1} />
					</G>
				</G>

				{/* ===== Check valve next to the air-release valve — foreground ===== */}
				<G transform="translate(-8684.805,-24383.883)">
					<G transform="translate(20.597701,-71.233715)">
						<GrayClapet />
					</G>
				</G>

				{/* ===== Fertigation system block (carré cliquable → page Fertigation) ===== */}
				{/* Pipe casings under the box */}
				<Path d="m -8805.6945,-24350.956 0.1906,20.134" fill="none" stroke="#111111" strokeWidth={12} />
				<Path d="m -8756.2784,-24351.221 0.1905,20.135" fill="none" stroke="#111111" strokeWidth={12} />
				<Path d="m -8805.7774,-24352.846 0.1896,22.072" fill="none" stroke="#ebe6e4" strokeWidth={8.357} />
				<Path d="m -8756.4245,-24352.846 0.1897,22.072" fill="none" stroke="#ebe6e4" strokeWidth={8.357} />
				{/* Label box (the tappable square) */}
				<Rect x={-8849.7832} y={-24377.717} width={132.03777} height={25.29459} rx={1.5} fill="#ebe6e4" stroke="#111111" strokeWidth={2.5} />
				<SvgText x={-8783.764} y={-24360.5} fontSize={11} fill="#7B1FA2" fontWeight="700" textAnchor="middle">
					Fertigation system
				</SvgText>
				{/* Two purple injection dashes: left flows up, right flows down */}
				{fertigationRunning && (
					<>
						<Path d="m -8805.3671,-24349.762 0.1794,17.383" fill="none" stroke="#cd87de" strokeWidth={5} strokeLinecap="round" strokeDasharray="10 10" strokeDashoffset={fertUp} />
						<Path d="m -8756.2921,-24349.762 0.1793,17.383" fill="none" stroke="#cd87de" strokeWidth={5} strokeLinecap="round" strokeDasharray="10 10" strokeDashoffset={fertDown} />
					</>
				)}
				{/* Transparent hit area over the square → Bacs (Tanks) tab */}
				<Rect
					x={-8849.7832}
					y={-24377.717}
					width={132.03777}
					height={25.29459}
					fill="#ffffff"
					fillOpacity={0.01}
					onPress={() => navigation.navigate('TanksStack')}
				/>
			</Svg>
				</Animated.View>
			</GestureDetector>

			<Text style={styles.zoomHint}>
				Pincez pour zoomer · glissez pour déplacer · double-tap pour réinitialiser
			</Text>

			{/* ===== Controls ===== */}
			<TouchableOpacity
				style={[styles.button, running ? styles.buttonStop : styles.buttonStart]}
				onPress={() => setRunning(r => !r)}
				activeOpacity={0.8}>
				<Icon name={running ? 'pause' : 'play'} size={18} color="#fff" style={styles.btnIcon} />
				<Text style={styles.buttonText}>
					{running ? 'Arrêter le circuit' : 'Démarrer le circuit'}
				</Text>
			</TouchableOpacity>

			<TouchableOpacity
				style={[styles.button, fertigationRunning ? styles.buttonStop : styles.buttonFert]}
				onPress={() => setFertigationRunning(r => !r)}
				activeOpacity={0.8}>
				<Icon name="flask" size={18} color="#fff" style={styles.btnIcon} />
				<Text style={styles.buttonText}>
					{fertigationRunning ? 'Arrêter la fertigation' : 'Démarrer la fertigation'}
				</Text>
			</TouchableOpacity>

			<View style={styles.valveGrid}>
				{VALVES.map((name, i) => {
					const on = running || valves[i];
					return (
						<TouchableOpacity
							key={name}
							style={[styles.valveBtn, on ? styles.valveOn : styles.valveOff]}
							onPress={() => toggleValve(i)}
							activeOpacity={0.8}>
							<Icon name="tint" size={16} color={on ? '#fff' : '#5A6470'} style={styles.valveIcon} />
							<Text style={[styles.valveText, on && styles.valveTextOn]}>{name}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</ScrollView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	root: {flex: 1, backgroundColor: '#fff'},
	container: {
		flexGrow: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		paddingVertical: 16
	},
	zoomBox: {
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center'
	},
	zoomHint: {
		marginTop: 10,
		fontSize: 11,
		color: '#888780',
		textAlign: 'center',
		paddingHorizontal: 16
	},
	button: {
		marginTop: 18,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 26,
		paddingVertical: 14,
		borderRadius: 30,
		elevation: 3,
		shadowColor: '#000',
		shadowOpacity: 0.2,
		shadowRadius: 4,
		shadowOffset: {width: 0, height: 2}
	},
	btnIcon: {marginRight: 10},
	buttonStart: {backgroundColor: '#1D9E75'},
	buttonFert: {backgroundColor: '#7B1FA2'},
	buttonStop: {backgroundColor: '#32404e'},
	buttonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
	valveGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		marginTop: 18,
		paddingHorizontal: 12
	},
	valveBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 22,
		margin: 6,
		borderWidth: 1.5,
		minWidth: 86,
		justifyContent: 'center'
	},
	valveIcon: {marginRight: 8},
	valveOn: {backgroundColor: '#185FA5', borderColor: '#0C447C'},
	valveOff: {backgroundColor: '#EEF2F6', borderColor: '#C8CDD2'},
	valveText: {color: '#5A6470', fontSize: 15, fontWeight: 'bold'},
	valveTextOn: {color: '#fff'}
});

export default FertigationScreen;
