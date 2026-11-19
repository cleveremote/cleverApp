import {ELEMENT_HEIGHT, ELEMENT_FONT_SIZE} from '../../styles/metrics';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faTasks,
	faPlug,
	faPowerOff,
	faSyncAlt,
	IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../data/cycleTypes';

// Outline sur fond gris au repos ; une fois actif, fond blanc et contour à la
// couleur principale.
const COLORS = {
	primary: '#32404e',
	muted: '#6b7785',
	border: '#d5dbe1',
	// Fond au repos : le gris de l'ancien compteur, un ton plus foncé.
	restBg: '#dce2e9',
	white: 'white'
};

// Les groupes (GROUP) sont listés avec les cycles classiques sous 'CYCLE'.
export type FilterKey = 'CYCLE' | 'MODULE' | 'EVENTS';

const SEGMENTS: {key: FilterKey; icon: IconDefinition}[] = [
	{key: 'CYCLE', icon: faSyncAlt},
	{key: 'MODULE', icon: faPowerOff},
	{key: 'EVENTS', icon: faTasks}
];

export function CycleFilterBar({
	active,
	onChange,
	counts
}: Readonly<{
	active: FilterKey;
	onChange: (key: FilterKey) => void;
	counts: Partial<Record<FilterKey, number>>;
}>) {
	const {t} = useTranslation('cycle');
	return (
		<View style={styles.bar}>
			{SEGMENTS.map(({key, icon}) => {
				const isActive = active === key;
				const count = counts[key] ?? 0;
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
							color={isActive ? COLORS.primary : COLORS.muted}
						/>
						<Text
							numberOfLines={1}
							style={[
								styles.label,
								isActive && styles.labelActive
							]}>
							{t(`filter.${key}`)}
						</Text>
						{count > 0 ? (
							<View
								style={[
									styles.badge,
									isActive && styles.badgeActive
								]}>
								<Text
									style={styles.badgeText}>
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
	// Hauteur fixe et contenu centré : passer de 1,5 à 2,5 px de cadre ne décale
	// rien.
	segment: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: ELEMENT_HEIGHT,
		borderRadius: 12,
		backgroundColor: COLORS.restBg,
		borderWidth: 1.5,
		borderColor: COLORS.border
	},
	segmentActive: {
		backgroundColor: COLORS.white,
		borderColor: COLORS.primary,
		borderWidth: 2.5
	},
	label: {
		color: COLORS.muted,
		fontSize: ELEMENT_FONT_SIZE,
		fontWeight: '600'
	},
	labelActive: {
		color: COLORS.primary,
		fontWeight: '800'
	},
	// Compteur : plein à la couleur du libellé (gris au repos, principale une
	// fois actif), chiffre blanc.
	badge: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		paddingHorizontal: 5,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.muted
	},
	badgeActive: {
		backgroundColor: COLORS.primary
	},
	badgeText: {
		color: COLORS.white,
		fontSize: 11,
		fontWeight: 'bold'
	},
});

export default CycleFilterBar;
