import React, {useEffect, useRef} from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {
	Camera,
	useCameraDevice,
	useCameraPermission,
	useCodeScanner
} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/FontAwesome5';

/**
 * The camera half of the QR pairing screen, kept in its own module on purpose.
 *
 * `react-native-vision-camera` reads its native constants at *import* time
 * (CameraDevices.ts calls `getConstants()` at the top level), so importing it
 * from a binary that does not embed the native code throws
 * "Cannot read property 'getConstants' of null" before any component renders.
 * Isolating it here lets ScanBoxScreen require it lazily and show a real message
 * instead of taking the whole AccessStack down. Never import this file eagerly.
 */

const COLORS = {
	primary: '#32404e',
	light: '#ffffff',
	viewfinder: '#000000',
	transparent: 'transparent'
};

export interface QrScannerProps {
	/** Pause the camera while the pairing that follows a scan is in flight. */
	isActive: boolean;
	onScanned: (raw: string) => void;
}

export function QrScanner({isActive, onScanned}: QrScannerProps) {
	const device = useCameraDevice('back');
	const {hasPermission, requestPermission} = useCameraPermission();

	// onCodeScanned fires on every frame that holds a code; this keeps one QR
	// from starting several pairing attempts.
	const handledRef = useRef(false);

	useEffect(() => {
		if (!hasPermission) requestPermission();
	}, [hasPermission, requestPermission]);

	useEffect(() => {
		// Re-arm when the parent goes back to scanning after an error.
		if (isActive) handledRef.current = false;
	}, [isActive]);

	const codeScanner = useCodeScanner({
		codeTypes: ['qr'],
		onCodeScanned: codes => {
			if (handledRef.current) return;
			const raw = codes[0]?.value;
			if (!raw) return;

			handledRef.current = true;
			onScanned(raw);
		}
	});

	if (!hasPermission) {
		return (
			<View style={styles.centered}>
				<Icon name="camera" size={40} color={COLORS.primary} />
				<Text style={styles.title}>Accès à la caméra nécessaire</Text>
				<Text style={styles.body}>
					{"L'application a besoin de la caméra pour lire le QR code collé sur votre box."}
				</Text>
				<TouchableOpacity
					style={styles.button}
					onPress={() => Linking.openSettings()}>
					<Text style={styles.buttonText}>Ouvrir les réglages</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (!device) {
		return (
			<View style={styles.centered}>
				<Icon name="video-slash" size={40} color={COLORS.primary} />
				<Text style={styles.title}>Caméra indisponible</Text>
				<Text style={styles.body}>
					{"Aucune caméra arrière n'a été trouvée sur cet appareil."}
				</Text>
			</View>
		);
	}

	return (
		<View style={styles.fill}>
			<Camera
				style={StyleSheet.absoluteFill}
				device={device}
				isActive={isActive}
				codeScanner={codeScanner}
			/>
			<View style={styles.overlay} pointerEvents="none">
				<View style={styles.reticle} />
				<Text style={styles.overlayText}>
					Visez le QR code collé sur la box
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	fill: {flex: 1, backgroundColor: COLORS.viewfinder},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 30
	},
	title: {
		color: COLORS.primary,
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 15,
		textAlign: 'center'
	},
	body: {
		color: COLORS.primary,
		fontSize: 15,
		marginTop: 10,
		textAlign: 'center',
		lineHeight: 21
	},
	button: {
		backgroundColor: COLORS.primary,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 25,
		marginTop: 25
	},
	buttonText: {color: COLORS.light, fontSize: 15, fontWeight: 'bold'},
	overlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center'
	},
	reticle: {
		width: 230,
		height: 230,
		borderWidth: 3,
		borderColor: COLORS.light,
		borderRadius: 16,
		backgroundColor: COLORS.transparent
	},
	overlayText: {
		color: COLORS.light,
		fontSize: 15,
		fontWeight: 'bold',
		marginTop: 20,
		textAlign: 'center'
	}
});

export default QrScanner;
