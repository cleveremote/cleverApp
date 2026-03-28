import React, {useEffect, useRef, useState} from 'react';
import {View, Animated, Easing} from 'react-native';
import {SvgXml} from 'react-native-svg';

const mySvg = `
<svg viewBox="0 0 200 200">
  <circle id="pointA" cx="100" cy="100" r="40" fill="blue" />
  <rect id="zoneB" x="20" y="20" width="60" height="60" fill="red" />
  <circle id="pointC" cx="150" cy="50" r="20" fill="green" />
</svg>
`;

export default function BlinkingSvg({elementId}) {
	const opacity = useRef(new Animated.Value(1)).current;
	const [svgContent, setSvgContent] = useState(mySvg);

	useEffect(() => {
		// Fonction qui fait clignoter l'élément
		const blink = () => {
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 0,
					duration: 500,
					easing: Easing.linear,
					useNativeDriver: true
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 500,
					easing: Easing.linear,
					useNativeDriver: true
				})
			]).start(() => blink());
		};
		blink();
	}, [opacity]);

	// On remplace l'élément SVG cible par une version avec opacity animé
	const animatedSvg = svgContent.replace(
		new RegExp(`id="${elementId}"([^>]*)fill="([^"]+)"`),
		`id="${elementId}"$1fill="$2" opacity="{opacity}"`
	);

	return (
		<View>
			{animatedSvg && <SvgXml xml={animatedSvg} width={200} height={200} />}
		</View>
	);
}
