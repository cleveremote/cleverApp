import React, {useEffect} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {AnimatedLogo, LOGO_ANIMATION_MS} from './AnimatedLogo';

// Laisse l'animation du logo se terminer, puis un court temps d'arrêt
const SPLASH_DURATION_MS = LOGO_ANIMATION_MS + 400;
// Ratio natif du SVG (width 400 / height 371)
const LOGO_RATIO = 371 / 400;
const LOGO_MAX_WIDTH = 400;

type SplashScreenProps = {
	onFinish: () => void;
};

export function SplashScreen({onFinish}: SplashScreenProps) {
	const {width} = useWindowDimensions();

	useEffect(() => {
		const timer = setTimeout(onFinish, SPLASH_DURATION_MS);
		return () => clearTimeout(timer);
	}, [onFinish]);

	const logoWidth = Math.min(width * 0.8, LOGO_MAX_WIDTH);

	return (
		<View style={styles.container}>
			<AnimatedLogo width={logoWidth} height={logoWidth * LOGO_RATIO} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'white'
	}
});
