import React, {useEffect} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog, faPlug} from '@fortawesome/free-solid-svg-icons';
import {MenuAccordion, MenuGroup} from '../../components/common/cycleMenu';
import {SettingsScrollView} from '../../components/common/SettingsScrollView';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {elementStack} from '../../components/cycle/moduleStack';
import {hapticOptions} from '../../data/cycleTypes';
import {
	ActuatorType,
	actuatorLabel,
	emptyActuatorConfig,
	listedRpiActuators
} from '../../data/actuatorTypes';
import {loadActuators} from '../../../module/process/infrasctructure/store/actions/actuator';
import {loadDevices} from '../../../module/process/infrasctructure/store/actions/device';
import {IS_EXPERT} from '../../../../config/env';

// Settings → My RPI : section « Actuators » listant les actuators RPI (GPIO du
// Raspberry), triés par libellé. Chaque ligne ouvre le menu de réglages
// de l'actuator ; le « + » (mode expert uniquement) en crée un nouveau. Les
// COM / CTRL, rattachés à un slave, se gèrent depuis la section « Actuators »
// de ce slave.
export function ActuatorsScreen(props: any) {
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
		props.loadDevices();
		const unsubscribe = props.navigation.addListener('focus', () => {
			props.loadActuators();
		});
		return unsubscribe;
	}, []);

	const labelOf = (actuator: any) => actuatorLabel(actuator, props.devices);

	const actuators = listedRpiActuators(props.actuators, props.devices);

	const openSettings = (params: any) =>
		props.navigation.navigate('ActuatorSettingsStack', {
			screen: 'ActuatorSettingsMenu',
			params
		});

	return (
		<SettingsScrollView>
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={1}
					name={'Actuators'}
					icon={faPlug}
					defaultExpanded
					onPress={() => {}}>
					<View style={styles.embeddedCard}>
						{actuators.length === 0 && !IS_EXPERT ? (
							<Text style={styles.empty}>No RPI actuator.</Text>
						) : null}
						{actuators.map((actuator: any) =>
							elementStack(
								actuator,
								(item: any) => openSettings({actuatorId: item.id}),
								labelOf(actuator),
								{name: faCog, color: styles.icon.color}
							)
						)}
						{IS_EXPERT && (
							<View style={styles.addRow}>
								<TouchableOpacity
									style={styles.addButton}
									onPress={() => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										openSettings({
											defaults: {
												type: ActuatorType.RPI,
												config: emptyActuatorConfig(
													ActuatorType.RPI
												)
											}
										});
									}}>
									<Icon name="times-circle" style={styles.icon} />
								</TouchableOpacity>
								<Text style={styles.addLabel}>
									Add new RPI actuator ...
								</Text>
							</View>
						)}
					</View>
				</MenuAccordion>
			</MenuGroup>
		</SettingsScrollView>
	);
}

const COLORS = {
	primary: '#32404e',
	muted: '#8a96a3',
	shadow: '#000',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas d'ombre ni de
	// marge, juste un peu de padding autour de la liste.
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		padding: 8,
		paddingBottom: 16
	},
	empty: {
		color: COLORS.muted,
		paddingVertical: 8,
		paddingHorizontal: 8
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
	actuators: state.root_actuator.actuators,
	devices: state.root_device.devices
});

export default connect(mapStateToProps, {loadActuators, loadDevices})(
	ActuatorsScreen
);
