import React, {useEffect} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import {AnimatedLogo} from './AnimatedLogo';
import {AnimatedTitle} from './AnimatedTitle';

// Durée totale du splash avant de passer à l'écran suivant
const SPLASH_DURATION_MS = 5000;
// Ratio natif du SVG (width 400 / height 371)
const LOGO_RATIO = 371 / 400;
const LOGO_MAX_WIDTH = 256;

type SplashScreenProps = {
	onFinish: () => void;
};

export function SplashScreen({onFinish}: SplashScreenProps) {
	const {width} = useWindowDimensions();

	useEffect(() => {
		const timer = setTimeout(onFinish, SPLASH_DURATION_MS);
		return () => clearTimeout(timer);
	}, [onFinish]);

	const logoWidth = Math.min(width * 0.512, LOGO_MAX_WIDTH);

	return (
		<View style={styles.container}>
			<AnimatedLogo width={logoWidth} height={logoWidth * LOGO_RATIO} />
			<AnimatedTitle />
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
