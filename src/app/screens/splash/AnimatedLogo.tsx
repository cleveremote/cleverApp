import React, {useEffect} from 'react';
import Animated, {
	Easing,
	SharedValue,
	useAnimatedProps,
	useReducedMotion,
	useSharedValue,
	withTiming
} from 'react-native-reanimated';
import Svg, {Circle, ClipPath, Defs, G, Path, Rect} from 'react-native-svg';

// Reproduction de logo-anime.svg : react-native-svg ne joue pas les
// @keyframes CSS, chaque animation est donc recodée ici avec la même
// timeline (délais et durées en secondes, identiques au SVG).

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const INK = '#32404e';
const WATER = '#54acff';
const SAP = '#62cf1b';

// Fin de la dernière animation (ripple : 2.05s + 1s)
const END = 3.05;
export const LOGO_ANIMATION_MS = END * 1000;

const EASE_DRAW = Easing.bezierFn(0.65, 0, 0.35, 1);
const EASE_FALL = Easing.bezierFn(0.34, 1.56, 0.64, 1);
const EASE_POP = Easing.bezierFn(0.34, 1.8, 0.64, 1);
const EASE = Easing.bezierFn(0.25, 0.1, 0.25, 1);
const EASE_IN_OUT = Easing.bezierFn(0.42, 0, 0.58, 1);
const EASE_OUT = Easing.bezierFn(0, 0, 0.58, 1);

// Longueurs réelles des tracés (pathLength="1" n'existe pas en natif)
const LEN_DROP = 56.1211;
const LEN_CHIP_LINE = 8.6631;
const LEN_LEAF = 26.2268;
const LEN_HAND = 27.8492;

const DROP_D =
	'm -472.23386,457.95005 -6.42516,5.70359 c -3.54812,3.14993 -3.65013,8.1668 -0.22785,11.20573 3.42232,3.03885 9.07299,2.94908 12.62143,-0.20052 3.5484,-3.14969 3.65086,-8.16656 0.22888,-11.20574 z';
const LEAF_LEFT_A =
	'm -524.00444,461.19532 a 13.887918,15.401954 80.996038 0 1 0.15218,0.79377 13.887918,15.401954 80.996038 0 1 -13.03866,16.12724 13.887918,15.401954 80.996038 0 1 -2.38782,0.2079';
const LEAF_LEFT_B =
	'M -539.7285,478.10976 a 13.887918,15.401954 80.996038 0 1 -0.15218,-0.79377 13.887918,15.401954 80.996038 0 1 13.03866,-16.12724 13.887918,15.401954 80.996038 0 1 2.38782,-0.2079';
const LEAF_RIGHT_A =
	'm -526.62245,450.45263 a 15.401954,13.887918 9.003962 0 0 -0.15218,0.79377 15.401954,13.887918 9.003962 0 0 13.03866,16.12724 15.401954,13.887918 9.003962 0 0 2.38782,0.2079';
const LEAF_RIGHT_B =
	'M -510.89839,467.36707 a 15.401954,13.887918 9.003962 0 0 0.15218,-0.79377 15.401954,13.887918 9.003962 0 0 -13.03866,-16.12724 15.401954,13.887918 9.003962 0 0 -2.38782,-0.2079';
const HAND_LEFT =
	'm -539.36188,478.59326 a 17.500509,13.773155 3.8078944 0 0 -0.17317,0.78606 17.500509,13.773155 3.8078944 0 0 14.83678,15.97073 17.500509,13.773155 3.8078944 0 0 2.71711,0.20588';
const HAND_RIGHT =
	'm -511.26501,467.85057 a 13.773155,17.500509 86.192106 0 1 0.17317,0.78606 13.773155,17.500509 86.192106 0 1 -14.83678,15.97073 13.773155,17.500509 86.192106 0 1 -2.71711,0.20588';

const CHIP_LINES = [
	{d: 'm -449.0056,476.65852 8.66308,0.0143', delay: 0.85},
	{d: 'm -449.0056,477.59099 8.66308,0.0143', delay: 0.9},
	{d: 'm -449.0056,478.52345 8.66308,0.0143', delay: 0.95},
	{d: 'm -449.0056,479.45592 8.66308,0.0143', delay: 1}
];

const FINGERS = [
	{d: 'm -560.36939,452.41073 10.58333,-10.96131', length: 15.2367, delay: 1.35, duration: 0.5, width: 0.965},
	{d: 'm -558.85806,450.78117 0.13364,-3.94224', length: 3.9445, delay: 1.5, duration: 0.3, width: 0.565},
	{d: 'm -556.05173,448.04164 h 3.27406', length: 3.2741, delay: 1.6, duration: 0.3, width: 0.565},
	{d: 'm -554.51493,446.03713 0.0668,-3.27406', length: 3.2747, delay: 1.7, duration: 0.3, width: 0.565},
	{d: 'm -551.57496,443.2308 h 2.27179', length: 2.2718, delay: 1.8, duration: 0.3, width: 0.565}
];

// Centres de transform-origin (fill-box)
const CHIP_CENTER = {x: -472.46198, y: 468.66572};
const LOGO_CENTER = {x: 20.3, y: 18.68};
const RIPPLE_CENTER = {x: 21.06, y: 23.8};

type Matrix = [number, number, number, number, number, number];

function phase(t: number, delay: number, duration: number) {
	'worklet';
	return Math.min(Math.max((t - delay) / duration, 0), 1);
}

// Équivalent de scale(s) rotate(deg) autour de (cx, cy)
function transformAbout(cx: number, cy: number, s: number, deg = 0): Matrix {
	'worklet';
	const r = (deg * Math.PI) / 180;
	const a = Math.max(s, 0.001) * Math.cos(r);
	const b = Math.max(s, 0.001) * Math.sin(r);
	return [a, b, -b, a, cx - a * cx + b * cy, cy - b * cx - a * cy];
}

function translateY(y: number): Matrix {
	'worklet';
	return [1, 0, 0, 1, 0, y];
}

const fallProps = (t: number) => {
	'worklet';
	const p = phase(t, 0, 0.9);
	return {
		matrix: translateY(-8 * (1 - EASE_FALL(p))),
		opacity: Math.min(Math.max(EASE_FALL(Math.min(p / 0.3, 1)), 0), 1)
	};
};

const chipProps = (t: number) => {
	'worklet';
	const p = EASE_POP(phase(t, 0.55, 0.45));
	return {matrix: transformAbout(CHIP_CENTER.x, CHIP_CENTER.y, p, -45 * (1 - p))};
};

// Remplissage (eau / sève) qui monte puis disparaît
const fillProps = (
	t: number,
	baseOpacity: number,
	fillDelay: number,
	fillDuration: number,
	fadeDelay: number
) => {
	'worklet';
	return {
		matrix: translateY(19 * (1 - EASE_IN_OUT(phase(t, fillDelay, fillDuration)))),
		opacity: baseOpacity * (1 - EASE(phase(t, fadeDelay, 0.6)))
	};
};

const pulseProps = (t: number) => {
	'worklet';
	const p = phase(t, 2.05, 0.6);
	const s =
		p < 0.5
			? 1 + 0.05 * EASE_IN_OUT(p / 0.5)
			: 1.05 - 0.05 * EASE_IN_OUT((p - 0.5) / 0.5);
	return {matrix: transformAbout(LOGO_CENTER.x, LOGO_CENTER.y, s)};
};

const rippleProps = (t: number) => {
	'worklet';
	if (t < 2.05) {
		return {matrix: transformAbout(RIPPLE_CENTER.x, RIPPLE_CENTER.y, 0.4), opacity: 0};
	}
	const p = EASE_OUT(phase(t, 2.05, 1));
	return {
		matrix: transformAbout(RIPPLE_CENTER.x, RIPPLE_CENTER.y, 0.4 + 2.2 * p),
		opacity: 0.7 * (1 - p)
	};
};

type DrawPathProps = {
	t: SharedValue<number>;
	d: string;
	length: number;
	strokeWidth: number;
	delay?: number;
	duration?: number;
	reverse?: boolean;
	strokeLinecap?: 'butt' | 'round';
	strokeLinejoin?: 'round' | 'bevel';
};

// Tracé qui se dessine (classe .draw / .rev du SVG)
function DrawPath({
	t,
	d,
	length,
	strokeWidth,
	delay = 0,
	duration = 0.7,
	reverse = false,
	strokeLinecap = 'round',
	strokeLinejoin
}: DrawPathProps) {
	const animatedProps = useAnimatedProps(() => {
		const p = phase(t.value, delay, duration);
		const remaining = length * (1 - EASE_DRAW(p));
		return {
			// Offset toujours positif (période 3L) pour éviter les phases négatives sur Android
			strokeDashoffset: reverse ? 3 * length - remaining : remaining,
			opacity: EASE_DRAW(Math.min(p / 0.04, 1))
		};
	});

	return (
		<AnimatedPath
			d={d}
			fill="none"
			stroke={INK}
			strokeWidth={strokeWidth}
			strokeLinecap={strokeLinecap}
			strokeLinejoin={strokeLinejoin}
			strokeDasharray={[length, 2 * length]}
			animatedProps={animatedProps}
		/>
	);
}

type AnimatedLogoProps = {
	width: number;
	height: number;
};

export function AnimatedLogo({width, height}: AnimatedLogoProps) {
	const reduceMotion = useReducedMotion();
	const start = reduceMotion ? END : 0;
	const t = useSharedValue(start);

	useEffect(() => {
		if (!reduceMotion) {
			t.value = withTiming(END, {duration: LOGO_ANIMATION_MS, easing: Easing.linear});
		}
	}, [reduceMotion, t]);

	const fall = useAnimatedProps(() => fallProps(t.value) as object);
	const chip = useAnimatedProps(() => chipProps(t.value) as object);
	const water = useAnimatedProps(() => fillProps(t.value, 0.35, 0.5, 1.1, 1.9) as object);
	const sap = useAnimatedProps(() => fillProps(t.value, 0.4, 1, 1, 2) as object);
	const pulse = useAnimatedProps(() => pulseProps(t.value) as object);
	const ripple = useAnimatedProps(() => rippleProps(t.value) as object);

	// État initial pour le premier rendu, avant la première frame animée
	const fallStart = fallProps(start);
	const waterStart = fillProps(start, 0.35, 0.5, 1.1, 1.9);
	const sapStart = fillProps(start, 0.4, 1, 1, 2);
	const rippleStart = rippleProps(start);

	const fingers = FINGERS.map((finger, index) => (
		<DrawPath
			key={index}
			t={t}
			d={finger.d}
			length={finger.length}
			delay={finger.delay}
			duration={finger.duration}
			strokeWidth={finger.width}
			strokeLinejoin="bevel"
		/>
	));

	const chipLines = CHIP_LINES.map((line, index) => (
		<DrawPath
			key={index}
			t={t}
			d={line.d}
			length={LEN_CHIP_LINE}
			delay={line.delay}
			duration={0.35}
			strokeWidth={0.389}
			strokeLinecap="butt"
		/>
	));

	return (
		<Svg width={width} height={height} viewBox="-2 -2 44.594552 41.358149">
			<Defs>
				<ClipPath id="dropClip">
					<Path d={DROP_D} />
				</ClipPath>
				<ClipPath id="leafLeftClip">
					<Path d={`${LEAF_LEFT_A} ${LEAF_LEFT_B}`} />
				</ClipPath>
				<ClipPath id="leafRightClip">
					<Path d={`${LEAF_RIGHT_A} ${LEAF_RIGHT_B}`} />
				</ClipPath>
			</Defs>

			<AnimatedCircle
				cx={RIPPLE_CENTER.x}
				cy={RIPPLE_CENTER.y}
				r={9}
				fill="none"
				stroke={WATER}
				strokeWidth={0.6}
				opacity={rippleStart.opacity}
				transform={rippleStart.matrix}
				animatedProps={ripple}
			/>

			<AnimatedG transform={pulseProps(start).matrix} animatedProps={pulse}>
				<G transform="translate(542.45172,-459.49724)">
					{/* Goutte + puce */}
					<G transform="translate(-49.157927,14.665139)">
						<AnimatedG
							opacity={fallStart.opacity}
							transform={fallStart.matrix}
							animatedProps={fall}>
							<G clipPath="url(#dropClip)">
								<AnimatedRect
									x={-482}
									y={457}
									width={20}
									height={20}
									fill={WATER}
									opacity={waterStart.opacity}
									transform={waterStart.matrix}
									animatedProps={water}
								/>
							</G>
							<DrawPath
								t={t}
								d={DROP_D}
								length={LEN_DROP}
								duration={0.9}
								strokeWidth={2.62185}
								strokeLinejoin="round"
							/>
							<G transform="translate(-27.787907,-9.398648)">{chipLines}</G>
							<G transform="rotate(90,-453.86869,459.47109)">{chipLines}</G>
							<AnimatedG transform={chipProps(start).matrix} animatedProps={chip}>
								<Rect
									fill={INK}
									stroke={INK}
									strokeWidth={0.117341}
									width={5.8811021}
									height={5.9123812}
									x={-475.40253}
									y={465.70953}
								/>
							</AnimatedG>
						</AnimatedG>
					</G>

					{/* Feuilles + mains */}
					<G transform="translate(0,-0.13363476)">
						{/* gauche */}
						<G clipPath="url(#leafLeftClip)">
							<AnimatedRect
								x={-541}
								y={460}
								width={18}
								height={20}
								fill={SAP}
								opacity={sapStart.opacity}
								transform={sapStart.matrix}
								animatedProps={sap}
							/>
						</G>
						<DrawPath t={t} d={LEAF_LEFT_A} length={LEN_LEAF} delay={0.9} reverse strokeWidth={2.7} strokeLinejoin="bevel" />
						<DrawPath t={t} d={LEAF_LEFT_B} length={LEN_LEAF} delay={0.9} strokeWidth={2.7} strokeLinejoin="bevel" />
						<DrawPath t={t} d={HAND_LEFT} length={LEN_HAND} delay={0.35} duration={0.8} strokeWidth={2.86615} strokeLinejoin="bevel" />
						<G transform="translate(23.174028,22.36892)">{fingers}</G>

						{/* droite */}
						<G transform="translate(7.3821974,10.742696)">
							<G clipPath="url(#leafRightClip)">
								<AnimatedRect
									x={-528}
									y={449}
									width={19}
									height={20}
									fill={SAP}
									opacity={sapStart.opacity}
									transform={sapStart.matrix}
									animatedProps={sap}
								/>
							</G>
							<DrawPath t={t} d={LEAF_RIGHT_A} length={LEN_LEAF} delay={0.9} reverse strokeWidth={2.7} strokeLinejoin="bevel" />
							<DrawPath t={t} d={LEAF_RIGHT_B} length={LEN_LEAF} delay={0.9} strokeWidth={2.7} strokeLinejoin="bevel" />
							<DrawPath t={t} d={HAND_RIGHT} length={LEN_HAND} delay={0.35} duration={0.8} strokeWidth={2.86615} strokeLinejoin="bevel" />
							<G transform="matrix(-1,0,0,1,-1073.6395,11.753858)">{fingers}</G>
						</G>
					</G>
				</G>
			</AnimatedG>
		</Svg>
	);
}
