import React, { useEffect, useRef } from 'react';
import {
	Animated,
	NativeScrollEvent,
	NativeSyntheticEvent,
	ScrollView,
	StyleSheet,
	View
} from 'react-native';

// Roue de sélection façon iOS pour Android, où le Picker natif n'est qu'une
// liste déroulante (dialog plein écran). ScrollView aimanté sur les lignes,
// ligne centrale surlignée, lignes voisines estompées et rétrécies.
export const WHEEL_ITEM_HEIGHT = 32;
const VISIBLE_ROWS = 5;
const SIDE_ROWS = (VISIBLE_ROWS - 1) / 2;
// Relâchement sans lancer : pas toujours d'événement d'inertie, on fige la
// valeur après ce délai si aucune inertie n'a démarré.
const DRAG_END_FALLBACK = 250;
// Gris translucide du bandeau de sélection iOS.
const HIGHLIGHT_COLOR = 'rgba(118,118,128,0.12)';

export function WheelPicker({
	options,
	value,
	onChange,
	onSpinningChange,
	color
}: {
	options: { label: string; value: number }[];
	value: number;
	onChange: (value: number) => void;
	onSpinningChange: (spinning: boolean) => void;
	color: string;
}) {
	const scrollRef = useRef<ScrollView>(null);
	const scrollY = useRef(new Animated.Value(0)).current;
	const selectedIndex = Math.max(
		0,
		options.findIndex(o => o.value === value)
	);
	// Index affiché par la roue : évite de la repositionner sur sa propre valeur.
	const currentIndex = useRef(selectedIndex);
	const dragEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearDragEndTimer = () => {
		if (dragEndTimer.current !== null) {
			clearTimeout(dragEndTimer.current);
			dragEndTimer.current = null;
		}
	};

	useEffect(() => clearDragEndTimer, []);

	// Valeur changée de l'extérieur (ex. réinitialisation) : on recale la roue.
	useEffect(() => {
		if (selectedIndex !== currentIndex.current) {
			currentIndex.current = selectedIndex;
			scrollRef.current?.scrollTo({
				y: selectedIndex * WHEEL_ITEM_HEIGHT,
				animated: false
			});
		}
	}, [selectedIndex]);

	const settle = (offsetY: number) => {
		clearDragEndTimer();
		const index = Math.min(
			options.length - 1,
			Math.max(0, Math.round(offsetY / WHEEL_ITEM_HEIGHT))
		);
		onSpinningChange(false);
		if (index !== currentIndex.current) {
			currentIndex.current = index;
			onChange(options[index].value);
		}
	};

	return (
		<View style={styles.container}>
			<View
				pointerEvents="none"
				style={[styles.highlight, { top: SIDE_ROWS * WHEEL_ITEM_HEIGHT }]}
			/>
			<Animated.ScrollView
				ref={scrollRef}
				nestedScrollEnabled
				showsVerticalScrollIndicator={false}
				snapToInterval={WHEEL_ITEM_HEIGHT}
				decelerationRate="fast"
				overScrollMode="never"
				contentOffset={{ x: 0, y: selectedIndex * WHEEL_ITEM_HEIGHT }}
				contentContainerStyle={styles.content}
				scrollEventThrottle={16}
				onScroll={Animated.event(
					[{ nativeEvent: { contentOffset: { y: scrollY } } }],
					{ useNativeDriver: true }
				)}
				onScrollBeginDrag={() => {
					clearDragEndTimer();
					onSpinningChange(true);
				}}
				onScrollEndDrag={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
					const y = e.nativeEvent.contentOffset.y;
					dragEndTimer.current = setTimeout(
						() => settle(y),
						DRAG_END_FALLBACK
					);
				}}
				onMomentumScrollBegin={clearDragEndTimer}
				onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
					settle(e.nativeEvent.contentOffset.y)
				}
			>
				{options.map((o, i) => {
					const inputRange = [
						(i - SIDE_ROWS) * WHEEL_ITEM_HEIGHT,
						i * WHEEL_ITEM_HEIGHT,
						(i + SIDE_ROWS) * WHEEL_ITEM_HEIGHT
					];
					return (
						<Animated.Text
							key={o.value}
							style={[
								styles.item,
								{
									color,
									opacity: scrollY.interpolate({
										inputRange,
										outputRange: [0.3, 1, 0.3],
										extrapolate: 'clamp'
									}),
									transform: [
										{
											scale: scrollY.interpolate({
												inputRange,
												outputRange: [0.8, 1, 0.8],
												extrapolate: 'clamp'
											})
										}
									]
								}
							]}
						>
							{o.label}
						</Animated.Text>
					);
				})}
			</Animated.ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		height: VISIBLE_ROWS * WHEEL_ITEM_HEIGHT
	},
	content: {
		// Marges pour que la première et la dernière ligne puissent se centrer.
		paddingVertical: SIDE_ROWS * WHEEL_ITEM_HEIGHT
	},
	// Bandeau gris arrondi derrière la ligne sélectionnée, comme la roue iOS.
	highlight: {
		position: 'absolute',
		left: 4,
		right: 4,
		height: WHEEL_ITEM_HEIGHT,
		borderRadius: 8,
		backgroundColor: HIGHLIGHT_COLOR
	},
	item: {
		height: WHEEL_ITEM_HEIGHT,
		lineHeight: WHEEL_ITEM_HEIGHT,
		fontSize: 20,
		textAlign: 'center',
		textAlignVertical: 'center',
		includeFontPadding: false
	}
});
