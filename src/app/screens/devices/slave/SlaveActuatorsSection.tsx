import React, {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {elementStack} from '../../../components/cycle/moduleStack';
import {loadActuators} from '../../../../module/process/infrasctructure/store/actions/actuator';
import {findModel, modelKind} from './SlaveModelSection';

// Kinds de modèle pour lesquels un slave pilote des actuators : seuls ceux-là
// affichent la section « Actuators ».
export const ACTUATOR_MODEL_KINDS = [
	'DIGITAL_IO_8CH',
	'ANALOG_OUTPUT_8CH',
	'ANALOG_OUTPUT_8CH_MA'
];

export const hasActuatorsSection = (models: any[], device: any) =>
	ACTUATOR_MODEL_KINDS.includes(modelKind(findModel(models, device)) ?? '');

// Même liste que Settings → Actuators, restreinte aux actuators qui ciblent ce
// slave (`config.deviceId`). Chaque ligne ouvre le menu de réglages de
// l'actuator. Embarquée dans l'accordéon « Actuators » du slave.
export function SlaveActuatorsSection(props: any) {
	const deviceId = props.device?.id;

	useEffect(() => {
		// Rechargé au retour sur le slave pour refléter les éditions faites dans
		// le menu de l'actuator.
		props.loadActuators();
		const unsubscribe = props.navigation.addListener('focus', () => {
			props.loadActuators();
		});
		return unsubscribe;
	}, []);

	const actuators = (props.actuators ?? []).filter(
		(a: any) =>
			!a.delete &&
			a.config?.deviceId != null &&
			`${a.config.deviceId}` === `${deviceId}`
	);

	return (
		<View style={styles.embeddedCard}>
			{actuators.length === 0 ? (
				<Text style={styles.empty}>
					No actuator linked to this device.
				</Text>
			) : (
				actuators.map((actuator: any) =>
					elementStack(
						actuator,
						(item: any) =>
							props.navigation.navigate('ActuatorSettingsStack', {
								screen: 'ActuatorSettingsMenu',
								params: {actuatorId: item.id}
							}),
						`${actuator.name ?? 'actuator'}`,
						{name: faCog, color: styles.icon.color}
					)
				)
			)}
		</View>
	);
}

const COLORS = {
	primary: '#32404e',
	muted: '#8a96a3',
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas d'ombre ni de
	// marge, juste un peu de padding autour de la liste.
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		padding: 8,
		paddingBottom: 16
	},
	icon: {
		color: COLORS.primary,
		fontSize: 30
	},
	empty: {
		color: COLORS.muted,
		paddingVertical: 8,
		paddingHorizontal: 8
	}
});

const mapStateToProps = (state: any) => ({
	actuators: state.root_actuator.actuators
});

export default connect(mapStateToProps, {loadActuators})(
	SlaveActuatorsSection
);
