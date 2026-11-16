import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {fieldLabelColor} from '../../styles/components/common/Input';

// Recherche + pastilles de filtre d'une liste (commandes d'un modèle, modules…).

const textColor = '#32404e';
const mutedColor = fieldLabelColor;
const COLORS = {
	chip: '#eef1f4',
	transparent: 'transparent'
};

// Recherche affichée seulement au-delà de ce nombre d'éléments : en deçà,
// la liste se parcourt d'un coup d'œil.
export const SEARCH_MIN_ITEMS = 10;
export const showsSearch = (count: number) => count > SEARCH_MIN_ITEMS;

// Minuscules sans accents : « écriture » trouve « Ecriture ».
export const normalizeSearch = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();

export function SearchField({
	value,
	onChange,
	placeholder,
	clearLabel
}: Readonly<{
	value: string;
	onChange: (text: string) => void;
	placeholder: string;
	clearLabel: string;
}>) {
	return (
		<View style={styles.search}>
			<Icon name="search" size={14} color={mutedColor} />
			<TextInput
				value={value}
				onChangeText={onChange}
				placeholder={placeholder}
				placeholderTextColor={mutedColor}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="search"
				style={styles.searchInput}
			/>
			{value ? (
				<Pressable
					onPress={() => onChange('')}
					hitSlop={10}
					accessibilityLabel={clearLabel}
				>
					<Icon name="times-circle" solid size={16} color={mutedColor} />
				</Pressable>
			) : null}
		</View>
	);
}

// Champ-bouton au style de la recherche (sélecteur, période…) : icône, valeur
// (ou placeholder grisé) et flèche d'ouverture.
export function PillButton({
	icon,
	label,
	placeholder,
	onPress
}: Readonly<{
	icon: string;
	label?: string;
	placeholder: string;
	onPress: () => void;
}>) {
	return (
		<Pressable
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={placeholder}
			style={({pressed}) => [styles.search, {opacity: pressed ? 0.6 : 1}]}
		>
			<Icon name={icon} size={14} color={mutedColor} />
			<Text
				numberOfLines={1}
				style={[styles.pillText, !label && {color: mutedColor}]}
			>
				{label || placeholder}
			</Text>
			<Icon name="chevron-down" size={12} color={mutedColor} />
		</Pressable>
	);
}

export type FilterChip<K extends string> = {key: K; label: string; color: string};

// Pastilles grises se partageant la largeur, chacune précédée d'un petit
// cercle à sa couleur (plein une fois active).
export function FilterChips<K extends string>({
	chips,
	isActive,
	onToggle
}: Readonly<{
	chips: FilterChip<K>[];
	isActive: (key: K) => boolean;
	onToggle: (key: K) => void;
}>) {
	return (
		<View style={styles.filters}>
			{chips.map(({key, label, color}) => {
				const active = isActive(key);
				return (
					<Pressable
						key={key}
						onPress={() => onToggle(key)}
						accessibilityState={{selected: active}}
						style={[styles.filter, active && {borderColor: color}]}
					>
						<View
							style={[
								styles.filterDot,
								{borderColor: color},
								active && {backgroundColor: color}
							]}
						/>
						<Text
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.8}
							style={[
								styles.filterText,
								active && styles.filterTextActive
							]}
						>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	// Champ de recherche : même gris que les pastilles, juste au-dessus.
	search: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: COLORS.chip,
		borderRadius: 18,
		paddingHorizontal: 12,
		marginTop: 4,
		marginHorizontal: -10,
		height: 38
	},
	pillText: {
		flex: 1,
		textAlign: 'left',
		color: textColor,
		fontSize: 14
	},
	searchInput: {
		flex: 1,
		textAlign: 'left',
		color: textColor,
		fontSize: 14,
		paddingVertical: 0
	},
	// Les pastilles se partagent toute la largeur, contenu centré.
	filters: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 4,
		marginBottom: 4,
		// Mord sur le padding de la carte (16) pour laisser plus de largeur.
		marginHorizontal: -10
	},
	filter: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
		backgroundColor: COLORS.chip,
		borderRadius: 18,
		// Cadre toujours présent (transparent au repos) pour que la sélection
		// ne décale rien ; il prend la couleur du filtre une fois actif.
		borderWidth: 2,
		borderColor: COLORS.transparent,
		paddingHorizontal: 4,
		paddingVertical: 8
	},
	filterDot: {width: 16, height: 16, borderRadius: 8, borderWidth: 2},
	filterText: {flexShrink: 1, color: textColor, fontSize: 12},
	filterTextActive: {fontWeight: '600'}
});
