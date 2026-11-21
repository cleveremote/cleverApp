import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
	Keyboard,
	KeyboardEvent,
	LayoutChangeEvent,
	NativeScrollEvent,
	NativeSyntheticEvent,
	Platform,
	ScrollView,
	ScrollViewProps,
	TextInput
} from 'react-native';

// Marge gardée visible sous le champ focus : laisse la place au message
// d'erreur de validation affiché sous l'input.
const DEFAULT_EXTRA_OFFSET = 56;

type Props = ScrollViewProps & {
	children?: React.ReactNode;
	extraOffset?: number;
};

// ScrollView qui fait défiler le champ focus (et son message d'erreur)
// au-dessus du clavier, en un seul mouvement :
// - iOS : on gère nous-mêmes l'inset du clavier (pas
//   automaticallyAdjustKeyboardInsets, qui ferait son propre défilement) et on
//   défile dès keyboardWillShow, en même temps que l'animation du clavier.
// - Android : la fenêtre est redimensionnée (adjustResize) ; on défile au
//   moment où le ScrollView rétrécit, ce qui remplace le défilement natif en
//   cours au lieu de s'y ajouter.
export function KeyboardAwareScrollView({
	children,
	extraOffset = DEFAULT_EXTRA_OFFSET,
	onScroll,
	onLayout,
	scrollEventThrottle,
	...rest
}: Props) {
	const scrollRef = useRef<ScrollView>(null);
	const scrollY = useRef(0);
	const height = useRef(0);
	const pendingKeyboardTop = useRef<number | null>(null);
	const [keyboardInset, setKeyboardInset] = useState(0);
	const keyboardInsetRef = useRef(0);
	keyboardInsetRef.current = keyboardInset;

	const scrollToFocusedInput = useCallback(
		(keyboardTop?: number) => {
			const scroll = scrollRef.current;
			const input: any = TextInput.State.currentlyFocusedInput();
			const content: any = (scroll as any)?.getInnerViewRef?.();
			if (!scroll || !input || !content) return;

			(scroll as any).measureInWindow(
				(_x: number, scrollTop: number, _w: number, scrollHeight: number) => {
					let visibleBottom = scrollTop + scrollHeight;
					if (keyboardTop !== undefined) {
						visibleBottom = Math.min(visibleBottom, keyboardTop);
					}
					const visibleHeight = visibleBottom - scrollTop;
					if (visibleHeight <= 0) return;

					// Échoue (callback ignoré) si l'input n'appartient pas à ce
					// ScrollView, ex. un autre écran encore monté dans la stack.
					input.measureLayout(
						content,
						(_ix: number, inputY: number, _iw: number, inputHeight: number) => {
							const target = inputY + inputHeight + extraOffset - visibleHeight;
							if (target > scrollY.current) {
								scroll.scrollTo({y: target, animated: true});
							} else if (inputY < scrollY.current) {
								scroll.scrollTo({y: Math.max(0, inputY - 16), animated: true});
							}
						},
						() => undefined
					);
				}
			);
		},
		[extraOffset]
	);

	// iOS : l'inset doit être appliqué avant de défiler, sinon le scroll est
	// limité à la hauteur du contenu.
	useEffect(() => {
		if (pendingKeyboardTop.current === null) return;
		const keyboardTop = pendingKeyboardTop.current;
		pendingKeyboardTop.current = null;
		scrollToFocusedInput(keyboardTop);
	}, [keyboardInset, scrollToFocusedInput]);

	useEffect(() => {
		if (Platform.OS === 'ios') {
			const show = Keyboard.addListener('keyboardWillShow', (e: KeyboardEvent) => {
				const keyboardTop = e.endCoordinates.screenY;
				(scrollRef.current as any)?.measureInWindow(
					(_x: number, scrollTop: number, _w: number, scrollHeight: number) => {
						const inset = Math.max(0, scrollTop + scrollHeight - keyboardTop);
						if (inset === keyboardInsetRef.current) {
							// Inset inchangé (changement de champ) : pas de re-render.
							scrollToFocusedInput(keyboardTop);
						} else {
							pendingKeyboardTop.current = keyboardTop;
							setKeyboardInset(inset);
						}
					}
				);
			});
			const hide = Keyboard.addListener('keyboardWillHide', () => {
				pendingKeyboardTop.current = null;
				setKeyboardInset(0);
			});
			return () => {
				show.remove();
				hide.remove();
			};
		}

		// Android : repli si le ScrollView n'a pas été redimensionné (ex. écran
		// dans une modale), sinon handleLayout s'en est déjà chargé.
		let timer: ReturnType<typeof setTimeout> | undefined;
		const show = Keyboard.addListener('keyboardDidShow', () => {
			const heightAtShow = height.current;
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => {
				if (height.current === heightAtShow) scrollToFocusedInput();
			}, 300);
		});
		return () => {
			if (timer) clearTimeout(timer);
			show.remove();
		};
	}, [scrollToFocusedInput]);

	const handleLayout = (e: LayoutChangeEvent) => {
		const newHeight = e.nativeEvent.layout.height;
		const shrunk = newHeight < height.current;
		height.current = newHeight;
		// Android : le rétrécissement correspond à l'ouverture du clavier
		// (keyboardDidShow peut arriver avant ou après ce layout).
		if (Platform.OS === 'android' && shrunk) {
			scrollToFocusedInput();
		}
		onLayout?.(e);
	};

	const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		scrollY.current = e.nativeEvent.contentOffset.y;
		onScroll?.(e);
	};

	const insets = {top: 0, left: 0, right: 0, bottom: keyboardInset};

	return (
		<ScrollView
			ref={scrollRef}
			keyboardShouldPersistTaps="handled"
			{...rest}
			automaticallyAdjustKeyboardInsets={false}
			contentInset={insets}
			scrollIndicatorInsets={insets}
			onLayout={handleLayout}
			onScroll={handleScroll}
			scrollEventThrottle={scrollEventThrottle ?? 16}>
			{children}
		</ScrollView>
	);
}
