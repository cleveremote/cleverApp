import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faGear, faSliders} from '@fortawesome/free-solid-svg-icons';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../components/common/cycleMenu';
import {SettingsScrollView} from '../../components/common/SettingsScrollView';
import {
	isEmpty,
	useSectionSettingsHeader
} from '../../components/common/useSectionSettingsHeader';
import {hapticOptions} from '../../data/cycleTypes';
import {ActuatorType, isComBased} from '../../data/actuatorTypes';
import {isTempId} from '../../../services/socket';
import {
	loadActuator,
	saveActuator,
	updateActuator
} from '../../../module/process/infrasctructure/store/actions/actuator';
import ActuatorGeneralSettingsSection from './ActuatorGeneralSettingsSection';
import ActuatorConfigurationSettingsSection from './ActuatorConfigurationSettingsSection';

// La section Configuration est « not valid » tant que les champs requis du type
// courant ne sont pas renseignés — mêmes règles que le sous-formulaire.
const isConfigInvalid = (actuator: any): boolean => {
	const config = actuator?.config;
	if (actuator?.type === ActuatorType.RPI) {
		return (
			isEmpty(config?.rpiPin) ||
			isEmpty(config?.direction) ||
			isEmpty(config?.edge)
		);
	}
	if (isComBased(actuator?.type)) {
		if (isEmpty(config?.deviceId)) return true;
		if (actuator?.type === ActuatorType.CTRL) {
			return isEmpty(config?.channel) || isEmpty(config?.valveType);
		}
		return false;
	}
	return true;
};

// Menu de réglages d'un actuator (création ou modification) : General +
// Configuration en accordéons embarqués, puis suppression. Même plomberie que
// les devices — le slot partagé `root_actuator.actuator` porte l'entité en cours
// d'édition et la sauvegarde socket est faite une seule fois, à la sortie.
export function ActuatorSettingsScreen(props: any) {
	const isCreateFlow = props.route.params?.actuatorId == null;
	// En création, `loadActuator` s'exécute dans un useEffect : au montage le
	// slot porte encore l'actuator édité précédemment, qu'il ne faut pas adopter.
	const staleIdOnMount = useRef<string | undefined>(
		isCreateFlow ? props.actuator?.id : undefined
	);
	const entityId = useRef<string | undefined>(props.route.params?.actuatorId);
	const actuatorRef = useRef<any>(isCreateFlow ? undefined : props.actuator);

	if (props.actuator) {
		if (
			entityId.current == null &&
			isTempId(props.actuator.id) &&
			props.actuator.id !== staleIdOnMount.current
		) {
			// Entité fraîchement créée par notre loadActuator : on adopte son id.
			entityId.current = props.actuator.id;
		}
		if (props.actuator.id === entityId.current) {
			actuatorRef.current = props.actuator;
		}
	}

	const deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		// Comme pour les sensors : on tague `delete` sur la ref et on sort, la
		// sauvegarde silencieuse du header persiste la suppression.
		actuatorRef.current = {
			...actuatorRef.current,
			delete: true,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadActuator(
			props.route.params?.actuatorId,
			props.route.params?.defaults
		);
	}, []);

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.actuator,
		isNew: isCreateFlow,
		hasChanges: () => !!actuatorRef.current?.isModified,
		save: onDone => {
			props.saveActuator(actuatorRef.current);
			onDone();
		},
		validate: () => ({
			general:
				isEmpty(actuatorRef.current?.name) ||
				isEmpty(actuatorRef.current?.type),
			configuration: isConfigInvalid(actuatorRef.current)
		}),
		backWhenPristine: true
	});

	// `ready` : l'entité de CET écran est bien dans le slot partagé. Les sections
	// embarquées ne doivent pas se monter avant (react-hook-form ne relit jamais
	// ses defaultValues après le montage).
	const ready =
		actuatorRef.current != null &&
		actuatorRef.current.id === entityId.current;

	return (
		<SettingsScrollView>
			<View style={styles.card}>
				<MenuAccordion
					key={1}
					name={'General'}
					icon={faGear}
					invalid={invalidSections.general}
					onPress={() => {}}>
					{ready && (
						<ActuatorGeneralSettingsSection
							key={actuatorRef.current.id}
							embedded
							actuatorData={actuatorRef.current}
							showErrors={invalidSections.general}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<MenuAccordion
					key={2}
					name={'Configuration'}
					icon={faSliders}
					invalid={invalidSections.configuration}
					onPress={() => {}}>
					{ready && (
						// Keyée sur le type : changer de type dans General
						// réinitialise la config, la section doit se remonter pour
						// re-seeder ses defaultValues.
						<ActuatorConfigurationSettingsSection
							key={`${actuatorRef.current.id}-${actuatorRef.current.type}`}
							embedded
							actuatorData={actuatorRef.current}
							showErrors={invalidSections.configuration}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				<DeleteItemMenu key={3} OnConfirm={deleteItem} />
			</View>
		</SettingsScrollView>
	);
}

const COLORS = {
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
	}
});

const mapStateToProps = (state: any) => ({
	actuator: state.root_actuator.actuator,
	actuators: state.root_actuator.actuators
});

export default connect(mapStateToProps, {
	loadActuator,
	updateActuator,
	saveActuator
})(ActuatorSettingsScreen);
