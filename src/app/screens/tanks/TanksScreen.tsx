import React, {useEffect, useRef, useState} from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
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
	Line,
	G,
	Text as SvgText
} from 'react-native-svg';
import Icon from 'react-native-vector-icons/FontAwesome5';

// Turbine rotation period (ms for a full turn).
const SPIN_MS = 700;

// Standing-wave parameters per water layer. The surface undulates IN PLACE
// (crests bob up and down) instead of scrolling: y = base + a·sin(k·x)·sin(ω·t),
// combining two components for a more natural ripple.
type WaveParams = {
	baseY: number;
	a1: number;
	k1: number;
	p1: number;
	w1: number;
	a2: number;
	k2: number;
	p2: number;
	w2: number;
	po: number;
};

const WAVE: {layer1: WaveParams; layer2: WaveParams} = {
	layer1: {
		baseY: 360,
		a1: 8,
		k1: (2 * Math.PI) / 120,
		p1: 0,
		w1: (2 * Math.PI) / 1.9,
		a2: 5,
		k2: (2 * Math.PI) / 68,
		p2: 1.1,
		w2: (2 * Math.PI) / 1.35,
		po: 0
	},
	layer2: {
		baseY: 367,
		a1: 6,
		k1: (2 * Math.PI) / 95,
		p1: 0.8,
		w1: (2 * Math.PI) / 2.3,
		a2: 4,
		k2: (2 * Math.PI) / 55,
		p2: 2.0,
		w2: (2 * Math.PI) / 1.6,
		po: 1.2
	}
};

/**
 * Build a closed "water" path whose top surface is a standing wave evaluated at
 * time t (seconds). The crests oscillate vertically in place — no horizontal
 * scrolling. The path spans [left, right] then fills down to bottomY.
 */
const buildWave = (
	left: number,
	right: number,
	bottomY: number,
	t: number,
	p: WaveParams
) => {
	const step = 8;
	let d = '';
	for (let x = left; x <= right; x += step) {
		const y =
			p.baseY +
			p.a1 * Math.sin(p.k1 * x + p.p1) * Math.sin(p.w1 * t) +
			p.a2 * Math.sin(p.k2 * x + p.p2) * Math.sin(p.w2 * t + p.po);
		d += `${x === left ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
	}
	d += `L ${right.toFixed(1)} ${bottomY} L ${left.toFixed(1)} ${bottomY} Z`;
	return d;
};

// Grille bars on the side of the blower motor.
const grille = (x: number) =>
	Array.from({length: 9}, (_, i) => (
		<Line
			key={`g-${x}-${i}`}
			x1={x}
			y1={42 + i * 8}
			x2={x + 4}
			y2={42 + i * 8}
			stroke="#378ADD"
			strokeWidth={1}
		/>
	));

type GaugeProps = {x: number; right?: boolean};
// 25/50/75% gauge ticks alongside a tank.
const gaugeTicks = ({x, right}: GaugeProps) => {
	const rows = [
		{y: 400, label: '75%'},
		{y: 463, label: '50%'},
		{y: 518, label: '25%'}
	];
	return rows.map(r => (
		<React.Fragment key={`tick-${x}-${r.y}`}>
			<Line
				x1={x}
				y1={r.y}
				x2={right ? x + 10 : x - 9}
				y2={r.y}
				stroke="#5F5E5A"
				strokeWidth={1}
			/>
			<SvgText
				x={right ? x + 14 : x - 13}
				y={r.y + 4}
				fontSize={10}
				fill="#444441"
				textAnchor={right ? 'start' : 'end'}>
				{r.label}
			</SvgText>
		</React.Fragment>
	));
};

const turbineBlades = (cy: number) => (
	<>
		<Line x1={340} y1={cy - 20} x2={340} y2={cy + 20} stroke="#378ADD" strokeWidth={3} strokeLinecap="round" />
		<Line x1={320} y1={cy} x2={360} y2={cy} stroke="#378ADD" strokeWidth={3} strokeLinecap="round" />
		<Line x1={326} y1={cy - 14} x2={354} y2={cy + 14} stroke="#85B7EB" strokeWidth={2} strokeLinecap="round" />
		<Line x1={354} y1={cy - 14} x2={326} y2={cy + 14} stroke="#85B7EB" strokeWidth={2} strokeLinecap="round" />
	</>
);

export function TanksScreen() {
	const {width} = useWindowDimensions();
	const [running, setRunning] = useState(true);

	// Elapsed animation time (ms). Driven by a requestAnimationFrame loop so the
	// whole SVG re-renders every frame — robust across react-native-svg /
	// reanimated version quirks (animated SVG transform props don't reliably
	// tick on the UI thread).
	const [elapsed, setElapsed] = useState(0);
	const accRef = useRef(0);

	useEffect(() => {
		if (!running) {
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
	}, [running]);

	const t = elapsed / 1000;
	const rot = ((elapsed / SPIN_MS) * 360) % 360;
	const tank1L1 = buildWave(40, 238, 600, t, WAVE.layer1);
	const tank1L2 = buildWave(40, 238, 600, t, WAVE.layer2);
	const tank2L1 = buildWave(442, 640, 600, t, WAVE.layer1);
	const tank2L2 = buildWave(442, 640, 600, t, WAVE.layer2);

	const svgWidth = Math.min(width - 24, 520);
	const svgHeight = (svgWidth * 660) / 680;

	return (
		<View style={styles.container}>
			<Svg width={svgWidth} height={svgHeight} viewBox="0 0 680 660">
				<Defs>
					<LinearGradient id="wG" x1="0%" y1="0%" x2="100%" y2="0%">
						<Stop offset="0%" stopColor="#5F5E5A" />
						<Stop offset="10%" stopColor="#B4B2A9" />
						<Stop offset="48%" stopColor="#F1EFE8" />
						<Stop offset="86%" stopColor="#B4B2A9" />
						<Stop offset="100%" stopColor="#5F5E5A" />
					</LinearGradient>
					<LinearGradient id="lG" x1="0%" y1="0%" x2="0%" y2="100%">
						<Stop offset="0%" stopColor="#5DCAA5" stopOpacity={0.9} />
						<Stop offset="100%" stopColor="#085041" stopOpacity={0.97} />
					</LinearGradient>
					<LinearGradient id="blueMotor" x1="0%" y1="0%" x2="100%" y2="0%">
						<Stop offset="0%" stopColor="#0C447C" />
						<Stop offset="35%" stopColor="#185FA5" />
						<Stop offset="65%" stopColor="#0C447C" />
						<Stop offset="100%" stopColor="#042C53" />
					</LinearGradient>
					<LinearGradient id="blueTurb" x1="0%" y1="0%" x2="0%" y2="100%">
						<Stop offset="0%" stopColor="#378ADD" />
						<Stop offset="50%" stopColor="#185FA5" />
						<Stop offset="100%" stopColor="#0C447C" />
					</LinearGradient>
					<LinearGradient id="pipeG" x1="0%" y1="0%" x2="100%" y2="0%">
						<Stop offset="0%" stopColor="#888780" />
						<Stop offset="45%" stopColor="#D3D1C7" />
						<Stop offset="100%" stopColor="#888780" />
					</LinearGradient>
					<ClipPath id="tc1">
						<Path d="M42,310 L42,560 Q42,582 60,590 L218,590 Q236,582 236,560 L236,310 Z" />
					</ClipPath>
					<ClipPath id="tc2">
						<Path d="M444,310 L444,560 Q444,582 462,590 L620,590 Q638,582 638,560 L638,310 Z" />
					</ClipPath>
				</Defs>

				{/* ===== BLOWER ===== */}
				<Path d="M328,18 Q328,6 340,6 Q352,6 352,18" fill="none" stroke="#185FA5" strokeWidth={4} strokeLinecap="round" />
				<Rect x={324} y={16} width={32} height={8} rx={3} fill="#185FA5" stroke="#0C447C" strokeWidth={1} />
				<Rect x={306} y={24} width={68} height={186} rx={10} fill="url(#blueMotor)" stroke="#042C53" strokeWidth={2} />

				<Rect x={302} y={34} width={6} height={76} rx={2} fill="#042C53" stroke="#0C447C" strokeWidth={0.8} />
				{grille(303)}
				<Rect x={372} y={34} width={6} height={76} rx={2} fill="#042C53" stroke="#0C447C" strokeWidth={0.8} />
				{grille(373)}

				{/* Turbine 1 */}
				<Circle cx={340} cy={108} r={30} fill="url(#blueTurb)" stroke="#042C53" strokeWidth={1.5} />
				<Circle cx={340} cy={108} r={23} fill="#042C53" stroke="#0C447C" strokeWidth={1} />
				<G rotation={rot} originX={340} originY={108}>{turbineBlades(108)}</G>
				<Circle cx={340} cy={108} r={5.5} fill="#185FA5" stroke="#85B7EB" strokeWidth={1} />

				<Rect x={310} y={134} width={60} height={8} rx={3} fill="#0C447C" stroke="#042C53" strokeWidth={1} />

				{/* Turbine 2 */}
				<Circle cx={340} cy={162} r={30} fill="url(#blueTurb)" stroke="#042C53" strokeWidth={1.5} />
				<Circle cx={340} cy={162} r={23} fill="#042C53" stroke="#0C447C" strokeWidth={1} />
				<G rotation={-rot} originX={340} originY={162}>{turbineBlades(162)}</G>
				<Circle cx={340} cy={162} r={5.5} fill="#185FA5" stroke="#85B7EB" strokeWidth={1} />

				<Rect x={314} y={186} width={52} height={18} rx={3} fill="#042C53" stroke="#0C447C" strokeWidth={0.8} />

				{/* 220V cable */}
				<Path d="M374,50 Q430,50 430,22 L460,22" fill="none" stroke="#cc2222" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
				<Rect x={460} y={14} width={20} height={16} rx={3} fill="#2C2A28" stroke="#444441" strokeWidth={1} />
				<Circle cx={466} cy={22} r={2.2} fill="#5F5E5A" />
				<Circle cx={474} cy={22} r={2.2} fill="#5F5E5A" />
				<SvgText x={484} y={27} fontSize={10} fill="#888780">220V</SvgText>

				<Rect x={328} y={210} width={24} height={12} rx={4} fill="#185FA5" stroke="#0C447C" strokeWidth={1.2} />

				{/* ===== PIPES + T ===== */}
				<Rect x={334} y={222} width={12} height={52} rx={2} fill="url(#pipeG)" stroke="#888780" strokeWidth={1} />
				<Rect x={200} y={268} width={280} height={12} rx={4} fill="#888780" stroke="#5F5E5A" strokeWidth={1.2} />
				<Rect x={334} y={262} width={12} height={24} rx={2} fill="#B4B2A9" stroke="#888780" strokeWidth={1} />
				<Rect x={326} y={258} width={28} height={10} rx={4} fill="#5F5E5A" stroke="#444441" strokeWidth={1} />

				<Rect x={42} y={268} width={160} height={12} rx={2} fill="url(#pipeG)" stroke="#888780" strokeWidth={1} />
				<Path d="M42,274 Q32,274 32,286 L32,306" fill="none" stroke="#B4B2A9" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
				<Path d="M42,274 Q32,274 32,286 L32,306" fill="none" stroke="#D3D1C7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />

				<Rect x={478} y={268} width={160} height={12} rx={2} fill="url(#pipeG)" stroke="#888780" strokeWidth={1} />
				<Path d="M638,274 Q648,274 648,286 L648,306" fill="none" stroke="#B4B2A9" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
				<Path d="M638,274 Q648,274 648,286 L648,306" fill="none" stroke="#D3D1C7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />

				{/* ===== TANK 1 ===== */}
				<Rect x={28} y={304} width={8} height={12} rx={2} fill="url(#pipeG)" stroke="#888780" strokeWidth={0.8} />
				<Rect x={42} y={304} width={194} height={12} rx={4} fill="url(#wG)" stroke="#5F5E5A" strokeWidth={1.5} />
				<Rect x={25} y={299} width={18} height={18} rx={3} fill="#444441" stroke="#2C2A28" strokeWidth={1} />
				<Rect x={28} y={302} width={12} height={12} rx={2} fill="#2C2A28" />
				<Circle cx={65} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Circle cx={95} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Circle cx={185} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Circle cx={215} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Path d="M42,310 L42,560 Q42,582 60,590 L218,590 Q236,582 236,560 L236,310 Z" fill="url(#wG)" stroke="#5F5E5A" strokeWidth={2} />

				<G clipPath="url(#tc1)">
					<Path d={tank1L1} fill="url(#lG)" />
					<Path d={tank1L2} fill="#1D9E75" fillOpacity={0.22} />
				</G>
				<Rect x={42} y={310} width={6} height={250} fill="#D3D1C7" fillOpacity={0.3} />

				<Rect x={55} y={588} width={10} height={40} rx={2} fill="#5F5E5A" stroke="#444441" strokeWidth={1} />
				<Rect x={213} y={588} width={10} height={40} rx={2} fill="#5F5E5A" stroke="#444441" strokeWidth={1} />
				<Rect x={44} y={624} width={34} height={7} rx={2} fill="#444441" />
				<Rect x={202} y={624} width={34} height={7} rx={2} fill="#444441" />
				<Rect x={112} y={586} width={36} height={14} rx={3} fill="#444441" stroke="#2C2A28" strokeWidth={1} />
				<Rect x={124} y={591} width={12} height={4} rx={1} fill="#888780" />
				<Rect x={30} y={370} width={6} height={186} rx={2} fill="#D3D1C7" fillOpacity={0.42} stroke="#888780" strokeWidth={0.5} />
				{gaugeTicks({x: 36})}

				{/* ===== TANK 2 ===== */}
				<Rect x={644} y={304} width={8} height={12} rx={2} fill="url(#pipeG)" stroke="#888780" strokeWidth={0.8} />
				<Rect x={444} y={304} width={194} height={12} rx={4} fill="url(#wG)" stroke="#5F5E5A" strokeWidth={1.5} />
				<Rect x={638} y={299} width={18} height={18} rx={3} fill="#444441" stroke="#2C2A28" strokeWidth={1} />
				<Rect x={641} y={302} width={12} height={12} rx={2} fill="#2C2A28" />
				<Circle cx={465} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Circle cx={495} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Circle cx={585} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Circle cx={617} cy={310} r={3.5} fill="#888780" stroke="#5F5E5A" strokeWidth={0.8} />
				<Path d="M444,310 L444,560 Q444,582 462,590 L620,590 Q638,582 638,560 L638,310 Z" fill="url(#wG)" stroke="#5F5E5A" strokeWidth={2} />

				<G clipPath="url(#tc2)">
					<Path d={tank2L1} fill="url(#lG)" />
					<Path d={tank2L2} fill="#1D9E75" fillOpacity={0.22} />
				</G>
				<Rect x={444} y={310} width={6} height={250} fill="#D3D1C7" fillOpacity={0.3} />

				<Rect x={458} y={588} width={10} height={40} rx={2} fill="#5F5E5A" stroke="#444441" strokeWidth={1} />
				<Rect x={614} y={588} width={10} height={40} rx={2} fill="#5F5E5A" stroke="#444441" strokeWidth={1} />
				<Rect x={446} y={624} width={34} height={7} rx={2} fill="#444441" />
				<Rect x={602} y={624} width={34} height={7} rx={2} fill="#444441" />
				<Rect x={512} y={586} width={36} height={14} rx={3} fill="#444441" stroke="#2C2A28" strokeWidth={1} />
				<Rect x={524} y={591} width={12} height={4} rx={1} fill="#888780" />
				<Rect x={644} y={370} width={6} height={186} rx={2} fill="#D3D1C7" fillOpacity={0.42} stroke="#888780" strokeWidth={0.5} />
				{gaugeTicks({x: 644, right: true})}
			</Svg>

			<TouchableOpacity
				style={[styles.button, running ? styles.buttonStop : styles.buttonStart]}
				onPress={() => setRunning(r => !r)}
				activeOpacity={0.8}>
				<Icon name={running ? 'pause' : 'play'} size={18} color="#fff" style={{marginRight: 10}} />
				<Text style={styles.buttonText}>
					{running ? 'Arrêter l’animation' : 'Démarrer l’animation'}
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
		paddingVertical: 16
	},
	button: {
		marginTop: 24,
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
	buttonStart: {backgroundColor: '#1D9E75'},
	buttonStop: {backgroundColor: '#32404e'},
	buttonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'}
});

export default TanksScreen;
