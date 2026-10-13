import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faEthernet,
	faMicrochip,
	faSliders,
	IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../data/cycleTypes';
import {ActuatorType} from '../../data/actuatorTypes';

export type ActuatorFilterKey = ActuatorType;

// Même barre segmentée que celle des cycles (CycleFilterBar), câblée sur les
// trois types d'actuators. Le badge affiche le nombre d'actuators du type.
const SEGMENTS: {
	key: ActuatorFilterKey;
	label: string;
	icon: IconDefinition;
}[] = [
	{key: ActuatorType.RPI, label: 'RPI', icon: faMicrochip},
	{key: ActuatorType.COM, label: 'COM', icon: faEthernet},
	{key: ActuatorType.CTRL, label: 'CTRL', icon: faSliders}
];

export function ActuatorFilterBar({
	active,
	onChange,
	counts
}: Readonly<{
	active: ActuatorFilterKey;
	onChange: (key: ActuatorFilterKey) => void;
	counts: Record<ActuatorFilterKey, number>;
}>) {
	return (
		<View style={styles.bar}>
			{SEGMENTS.map(({key, label, icon}) => {
				const isActive = active === key;
				const count = counts[key];
				return (
					<Pressable
						key={key}
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							onChange(key);
						}}
						style={({pressed}) => [
							styles.segment,
							isActive && styles.segmentActive,
							{transform: [{scale: pressed ? 0.98 : 1}]}
						]}>
						<FontAwesomeIcon
							icon={icon}
							size={15}
							color={isActive ? 'white' : '#32404e'}
						/>
						<Text
							numberOfLines={1}
							style={[styles.label, isActive && styles.labelActive]}>
							{label}
						</Text>
						{count > 0 ? (
							<View
								style={[
									styles.badge,
									isActive && styles.badgeActive
								]}>
								<Text
									style={[
										styles.badgeText,
										isActive && styles.badgeTextActive
									]}>
									{count}
								</Text>
							</View>
						) : null}
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: 'row',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 8
	},
	segment: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: 38,
		borderRadius: 12,
		backgroundColor: 'white',
		borderWidth: 1,
		borderColor: '#e2e8f0',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.18,
		shadowRadius: 2
	},
	segmentActive: {
		backgroundColor: '#32404e',
		borderColor: '#32404e'
	},
	label: {
		color: '#32404e',
		fontSize: 13,
		fontWeight: 'bold'
	},
	labelActive: {
		color: 'white'
	},
	badge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		paddingHorizontal: 5,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#32404e'
	},
	badgeActive: {
		backgroundColor: 'white'
	},
	badgeText: {
		color: 'white',
		fontSize: 11,
		fontWeight: 'bold'
	},
	badgeTextActive: {
		color: '#32404e'
	}
});

export default ActuatorFilterBar;
