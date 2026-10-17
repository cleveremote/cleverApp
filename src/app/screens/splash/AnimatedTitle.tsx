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

// "HYDRO-PHYTO" révélé en 3 temps (HYDRO, -, PHYTO), calé pour se
// terminer avant la fin de l'animation du logo.
const STEP_DELAYS_MS = [1600, 2000, 2400];
const STEP_DURATION_MS = 400;
const OFFSET_X = 24;
const EASE_OUT = Easing.bezierFn(0, 0, 0.58, 1);

const PARTS = ['HYDRO', '-', 'PHYTO'];

function TitlePart({text, delay}: {text: string; delay: number}) {
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

	const style = useAnimatedStyle(() => ({
		opacity: progress.value,
		transform: [{translateX: (progress.value - 1) * OFFSET_X}]
	}));

	return <Animated.Text style={[styles.text, style]}>{text}</Animated.Text>;
}

export function AnimatedTitle() {
	return (
		<View style={styles.row}>
			{PARTS.map((part, index) => (
				<TitlePart
					key={part}
					text={part}
					delay={STEP_DELAYS_MS[index]}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignSelf: 'center',
		justifyContent: 'center',
		marginTop: 24
	},
	text: {
		color: '#32404e',
		fontSize: 34,
		letterSpacing: 2,
		fontWeight: 'bold'
	}
});
