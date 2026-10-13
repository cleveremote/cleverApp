import React, {useEffect} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {ScrollView} from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {elementStack} from '../../components/cycle/moduleStack';
import ActuatorFilterBar, {
	ActuatorFilterKey
} from '../../components/actuator/ActuatorFilterBar';
import {hapticOptions} from '../../data/cycleTypes';
import {ActuatorType, emptyActuatorConfig} from '../../data/actuatorTypes';
import {loadActuators} from '../../../module/process/infrasctructure/store/actions/actuator';

// Top level of the Actuators area (Settings → Actuators): the master list of
// actuators, filtered by type with the same segmented bar as the cycles screen.
// Each row opens the actuator's own settings menu; the "+" row creates a new
// actuator of the currently selected type.
export function ActuatorsScreen(props: any) {
	const [activeFilter, setActiveFilter] = React.useState<ActuatorFilterKey>(
		ActuatorType.RPI
	);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		// Initial load, then reload on focus so the edits made in the settings
		// sub-navigator are reflected when the user comes back to the list.
		props.loadActuators();
		const unsubscribe = props.navigation.addListener('focus', () => {
			props.loadActuators();
		});
		return unsubscribe;
	}, []);

	const actuators = (props.actuators ?? []).filter((a: any) => !a.delete);

	const countOf = (type: ActuatorFilterKey) =>
		actuators.filter((a: any) => a.type === type).length;

	const counts = {
		[ActuatorType.RPI]: countOf(ActuatorType.RPI),
		[ActuatorType.COM]: countOf(ActuatorType.COM),
		[ActuatorType.CTRL]: countOf(ActuatorType.CTRL)
	};

	const openSettings = (params: any) =>
		props.navigation.navigate('ActuatorSettingsStack', {
			screen: 'ActuatorSettingsMenu',
			params
		});

	return (
		<View style={{flex: 1}}>
			<ActuatorFilterBar
				active={activeFilter}
				onChange={setActiveFilter}
				counts={counts}
			/>
			<ScrollView contentContainerStyle={{paddingBottom: 16}}>
				<View style={styles.container}>
					<View style={styles.card}>
						{actuators
							.filter((a: any) => a.type === activeFilter)
							.map((actuator: any) =>
								elementStack(
									actuator,
									(item: any) =>
										openSettings({actuatorId: item.id}),
									`${actuator.name ?? 'actuator'}`,
									{name: faCog, color: styles.icon.color}
								)
							)}
						<View style={styles.addRow}>
							<TouchableOpacity
								style={styles.addButton}
								onPress={() => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									// Le type (et donc la forme de la config) est
									// choisi par le filtre actif ; il reste
									// modifiable tant que l'actuator n'est pas
									// enregistré.
									openSettings({
										defaults: {
											type: activeFilter,
											config: emptyActuatorConfig(
												activeFilter
											)
										}
									});
								}}>
								<Icon name="times-circle" style={styles.icon} />
							</TouchableOpacity>
							<Text style={styles.addLabel}>
								{`Add new ${activeFilter} actuator ...`}
							</Text>
						</View>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		marginHorizontal: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	addRow: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: COLORS.primary,
		fontSize: 15
	},
	icon: {
		color: COLORS.primary,
		fontSize: 30
	}
});

const mapStateToProps = (state: any) => ({
	actuators: state.root_actuator.actuators
});

export default connect(mapStateToProps, {loadActuators})(ActuatorsScreen);
