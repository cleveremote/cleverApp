import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
	Easing,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withDelay,
	withTiming
} from 'react-native-reanimated';

// "HYDRO-PHYTO" révélé en 3 temps (HYDRO, -, PHYTO), puis le slogan,
// calé pour se terminer avant la fin du splash.
const STEP_DELAYS_MS = [1600, 2000, 2400];
const SLOGAN_DELAY_MS = 2800;
const STEP_DURATION_MS = 400;
const OFFSET_X = 24;
const SLOGAN_OFFSET_Y = 12;
const EASE_OUT = Easing.bezierFn(0, 0, 0.58, 1);

const PARTS = ['HYDRO', '-', 'PHYTO'];
const SLOGAN = 'Control Smarter, Grow Better.';

function useReveal(delay: number) {
	const reduceMotion = useReducedMotion();
	const progress = useSharedValue(reduceMotion ? 1 : 0);

	useEffect(() => {
		if (!reduceMotion) {
			progress.value = withDelay(
				delay,
				withTiming(1, {duration: STEP_DURATION_MS, easing: EASE_OUT})
			);
		}
	}, [delay, progress, reduceMotion]);

	return progress;
}

function TitlePart({text, delay}: {text: string; delay: number}) {
	const progress = useReveal(delay);
	const style = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [{translateX: (progress.value - 1) * OFFSET_X}]
	}));

	return <Animated.Text style={[styles.text, style]}>{text}</Animated.Text>;
}

function Slogan() {
	const progress = useReveal(SLOGAN_DELAY_MS);
	const style = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [{translateY: (1 - progress.value) * SLOGAN_OFFSET_Y}]
	}));

	return <Animated.Text style={[styles.slogan, style]}>{SLOGAN}</Animated.Text>;
}

export function AnimatedTitle() {
	return (
		<View>
			<View style={styles.row}>
				{PARTS.map((part, index) => (
					<TitlePart
						key={part}
						text={part}
						delay={STEP_DELAYS_MS[index]}
					/>
				))}
			</View>
			<Slogan />
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignSelf: 'center',
		justifyContent: 'center',
		marginTop: 4
	},
	text: {
		color: '#32404e',
		fontSize: 42,
		letterSpacing: 2,
		fontWeight: '900'
	},
	slogan: {
		color: '#32404e',
		fontSize: 22,
		letterSpacing: 1,
		fontWeight: '600',
		textAlign: 'center',
		marginTop: 8
	}
});
