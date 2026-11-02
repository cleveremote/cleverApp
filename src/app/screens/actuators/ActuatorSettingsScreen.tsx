import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faGaugeHigh, faGear, faSliders} from '@fortawesome/free-solid-svg-icons';
import {
	DeleteItemMenu,
	MenuAccordion,
	MenuGroup
} from '../../components/common/cycleMenu';
import {SettingsScrollView} from '../../components/common/SettingsScrollView';
import {
	isEmpty,
	useSectionSettingsHeader
} from '../../components/common/useSectionSettingsHeader';
import {hapticOptions} from '../../data/cycleTypes';
import {ActuatorType, isComBased} from '../../data/actuatorTypes';
import {isFollowLoop, loopOf} from '../../data/controlLoopTypes';
import {isTempId} from '../../../services/socket';
import {IS_EXPERT} from '../../../../config/env';
import {
	loadActuator,
	saveActuator,
	updateActuator
} from '../../../module/process/infrasctructure/store/actions/actuator';
import {
	loadControlLoops,
	saveControlLoop,
	updateControlLoop
} from '../../../module/process/infrasctructure/store/actions/control-loop';
import ActuatorGeneralSettingsSection from './ActuatorGeneralSettingsSection';
import ActuatorConfigurationSettingsSection from './ActuatorConfigurationSettingsSection';
import ActuatorRegulationSettingsSection from './ActuatorRegulationSettingsSection';
import i18n from 'i18next';

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
		// Une seule action (device command), qui doit porter son channel.
		const actions = config?.actions ?? [];
		return actions.length !== 1 || isEmpty(actions[0]?.channel);
	}
	return true;
};

// Régulation activée : il faut un capteur de retour et une consigne.
// En FOLLOW il n'y a pas de consigne : seule l'entrée analogique est requise.
const isRegulationInvalid = (loop: any): boolean =>
	!!loop?.isEnabled &&
	(isEmpty(loop?.sensorId) || (!isFollowLoop(loop) && isEmpty(loop?.setpoint)));

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
	// Boucle de régulation de la vanne (CTRL) : celle stagée par la section
	// Regulation si elle concerne cette vanne, sinon celle relue de la box.
	const loopRef = useRef<any>(undefined);

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
	const savedLoop = loopOf(props.loops, entityId.current);
	if (
		props.loop &&
		`${props.loop.actuatorId}` === `${entityId.current}` &&
		props.loop.isModified
	) {
		loopRef.current = props.loop;
	} else if (!loopRef.current?.isModified) {
		loopRef.current = savedLoop;
	}
	const isCtrl = actuatorRef.current?.type === ActuatorType.CTRL;

	const deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		// Comme pour les sensors : on tague `delete` sur la ref et on sort, la
		// sauvegarde silencieuse du header persiste la suppression.
		actuatorRef.current = {
			...actuatorRef.current,
			delete: true,
			isModified: true
		};
		// La boucle d'une vanne supprimée part avec elle.
		loopRef.current =
			loopRef.current && !isTempId(loopRef.current.id)
				? {...loopRef.current, delete: true, isModified: true}
				: undefined;
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadActuator(
			props.route.params?.actuatorId,
			props.route.params?.defaults
		);
		// Vide le slot d'édition (boucle d'une autre vanne) puis relit les boucles.
		props.updateControlLoop(undefined);
		props.loadControlLoops();
	}, []);

	// Sauvegarde de la boucle : une vanne neuve n'a son id définitif qu'une fois
	// enregistrée, la boucle est alors envoyée avec cet id.
	const saveLoop = (actuatorId: any) => {
		const loop = loopRef.current;
		if (!loop?.isModified) return;
		if (loop.delete && isTempId(loop.id)) return;
		props.saveControlLoop({...loop, actuatorId});
	};

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.actuator,
		isNew: isCreateFlow,
		hasChanges: () =>
			!!actuatorRef.current?.isModified || !!loopRef.current?.isModified,
		save: onDone => {
			const actuator = actuatorRef.current;
			if (actuator?.isModified) {
				const isNewActuator = isTempId(actuator.id);
				props.saveActuator(
					actuator,
					isNewActuator ? (saved: any) => saveLoop(saved.id) : undefined
				);
				if (!isNewActuator) saveLoop(actuator.id);
			} else {
				saveLoop(actuator?.id);
			}
			onDone();
		},
		validate: () => ({
			general: isEmpty(actuatorRef.current?.name),
			configuration: isConfigInvalid(actuatorRef.current),
			regulation:
				actuatorRef.current?.type === ActuatorType.CTRL &&
				isRegulationInvalid(loopRef.current)
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
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={1}
					name={i18n.t('common:sections.general')}
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
					name={i18n.t('common:sections.configuration')}
					icon={faSliders}
					invalid={invalidSections.configuration}
					onPress={() => {}}>
					{ready && (
						// Keyée sur le type : changer de type réinitialise la
						// config, la section doit se remonter pour
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
				{isCtrl && (
					<MenuAccordion
						key={3}
						name={i18n.t('cycle:controlLoop.regulation')}
						icon={faGaugeHigh}
						invalid={invalidSections.regulation}
						onPress={() => {}}>
						{ready && (
							// Keyée sur la boucle relue : elle se remonte quand la
							// liste des boucles arrive de la box.
							<ActuatorRegulationSettingsSection
								key={`${actuatorRef.current.id}-${savedLoop?.id ?? 'none'}`}
								actuatorData={actuatorRef.current}
								loopData={loopRef.current}
								showErrors={invalidSections.regulation}
							/>
						)}
					</MenuAccordion>
				)}
				{IS_EXPERT && <DeleteItemMenu key={4} OnConfirm={deleteItem} />}
			</MenuGroup>
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
	actuators: state.root_actuator.actuators,
	loop: state.root_control_loop.loop,
	loops: state.root_control_loop.loops
});

export default connect(mapStateToProps, {
	loadActuator,
	updateActuator,
	saveActuator,
	loadControlLoops,
	updateControlLoop,
	saveControlLoop
})(ActuatorSettingsScreen);
