import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import React, {useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {hapticOptions} from '../../../../data/cycleTypes';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {connect} from 'react-redux';
import {loadGroups} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {isTempId} from '../../../../../services/socket';

// Same normalization used by GroupStack: `iconColor` may be a plain color string
// or the `{base, icon}` object the rows expect.
const normalizeStyle = (style: any) => {
	if (!style) {
		return {
			bgColor: '#a5f3fc',
			fontColor: '#60a5fa',
			iconColor: {base: '#60a5fa', icon: '#60a5fa'}
		};
	}
	const ic = style.iconColor;
	if (ic && typeof ic === 'object') {
		return style;
	}
	return {...style, iconColor: {base: ic, icon: ic}};
};

export function CycleChildrenSettingsSection(props: any) {
	// Source du groupe : prop directe (mode embarqué inline dans
	// CycleSettingsScreen) ou params de route (mode écran autonome).
	const embedded = !!props.embedded;
	const groupId = (props.cycleData ?? props.route?.params?.cycleData)?.id;

	// A brand-new group still carries a temp id: it (and its children) live only
	// in memory until the group is saved.
	const groupIsTemp = !groupId || isTempId(groupId);

	// Resolve the group's persisted children against the flat cycles list,
	// ordered by `config.order`. We read from the authoritative `groups`/`cycles`
	// slices (refreshed on focus below) rather than the edited group copy so
	// children already linked by the box (via `parentCycleId`) show up.
	const group = (props.groups || []).find((x: any) => x.id === groupId);
	const savedChildren = [...(group?.childCycles || [])]
		.sort((a: any, b: any) => (a.config?.order ?? 0) - (b.config?.order ?? 0))
		.map((child: any) =>
			(props.cycles || []).find((c: any) => c.id === child.cycleId)
		)
		.filter((cycle: any) => cycle);

	// Children added before the group is persisted are held in memory (soft-saved
	// into the `cycles` slice with `parentCycleId` pointing at this group). They
	// carry a temp id and are pushed to the box — with the resolved real
	// `parentCycleId` — only when the group itself is saved (parity with how a
	// cycle's sequences are persisted together with the cycle).
	const pendingChildren = groupId
		? (props.cycles || []).filter(
				(c: any) => c.parentCycleId === groupId && isTempId(c.id)
		  )
		: [];

	const childCycles = [...savedChildren, ...pendingChildren]
		.filter((cycle: any) => cycle && !cycle.delete)
		.map((cycle: any) => ({...cycle, style: normalizeStyle(cycle.style)}));

	// Refresh so children linked by the box since we opened the group appear when
	// returning from the child creation flow. Skip it for a not-yet-saved group:
	// `loadGroups` reloads the whole `cycles` slice from the box and would wipe
	// the in-memory pending children.
	useFocusEffect(
		useCallback(() => {
			if (!groupIsTemp) props.loadGroups();
		}, [groupIsTemp])
	);

	React.useEffect(() => {
		// En mode embarqué, l'entête appartient à l'écran parent.
		if (embedded) return;
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.goBack();
					},
					'arrow-alt-circle-left',
					false
				)
		});
	}, []);

	const openChild = (cycle: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		// push (not navigate) so a new CycleSettingsMenu instance is stacked
		// instead of popping back to the group's own settings screen.
		props.navigation.push('CycleSettingsMenu', {...cycle});
	};

	const addChild = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		// Preset `parentCycleId` so the new cycle is associated to this group. When
		// the group already exists the box links it on the child's own save; when
		// the group is still in memory (temp id) the child is soft-saved and pushed
		// to the box together with the group when the group is saved.
		props.navigation.push('CycleSettingsMenu', {
			id: undefined,
			parentCycleId: groupId
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				{/* En mode embarqué (dans un accordéon), pas de ScrollView interne :
				    l'écran parent défile déjà et un ScrollView sans hauteur imposée
				    s'effondrerait. */}
				{(() => {
					const rows = childCycles.map(
						(cycle: any, index: number) => (
							<TouchableOpacity
								key={'child_' + index}
								style={[
									styles.row,
									{backgroundColor: cycle.style.bgColor}
								]}
								onPress={() => openChild(cycle)}>
								<Text
									style={[
										styles.rowLabel,
										{color: cycle.style.fontColor}
									]}
									numberOfLines={1}
									ellipsizeMode="middle">
									{cycle.name}
								</Text>
								<Icon
									name="cog"
									size={20}
									color={cycle.style.iconColor.icon}
								/>
							</TouchableOpacity>
						)
					);
					return embedded ? (
						<>{rows}</>
					) : (
						<ScrollView>{rows}</ScrollView>
					);
				})()}
				<View style={styles.addButtonWrapper}>
					<TouchableOpacity style={styles.addButton} onPress={addChild}>
						<Icon name="times-circle" size={30} color={colors.dark} />
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new cycle ...</Text>
				</View>
			</View>
		</View>
	);
}

const colors = {
	dark: '#32404e',
	shadow: '#000',
	white: 'white'
};

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		margin: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: colors.white,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: colors.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		height: 45,
		paddingHorizontal: 12,
		margin: 4
	},
	rowLabel: {
		flex: 1,
		fontWeight: 'bold',
		fontSize: 15,
		marginRight: 8
	},
	addButtonWrapper: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: colors.dark,
		fontSize: 15
	}
});

const mapStateToProps = (state: any) => ({
	groups: state.root_cycle.groups,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {
	loadGroups
})(CycleChildrenSettingsSection);
