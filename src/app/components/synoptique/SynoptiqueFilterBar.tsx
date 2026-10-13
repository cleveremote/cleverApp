import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faBorderAll,
	faDiagramProject,
	faWater,
	IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../data/cycleTypes';

export type SynoptiqueKey = 'FERTIGATION' | 'WELLHEAD' | 'FIELDVUE';

const SEGMENTS: {key: SynoptiqueKey; label: string; icon: IconDefinition}[] = [
	{key: 'FERTIGATION', label: 'Fertigation', icon: faWater},
	{key: 'WELLHEAD', label: 'Wellhead', icon: faDiagramProject},
	{key: 'FIELDVUE', label: 'FieldVue', icon: faBorderAll}
];

export function SynoptiqueFilterBar({
	active,
	onChange
}: Readonly<{
	active: SynoptiqueKey;
	onChange: (key: SynoptiqueKey) => void;
}>) {
	return (
		<View style={styles.bar}>
			{SEGMENTS.map(({key, label, icon}) => {
				const isActive = active === key;
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
	}
});

export default SynoptiqueFilterBar;
