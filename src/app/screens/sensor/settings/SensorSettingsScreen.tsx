import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {connect} from 'react-redux';
import {
	DeleteItemMenu,
	MenuAccordion,
	MenuGroup
} from '../../../components/common/cycleMenu';
import {
	useSectionSettingsHeader,
	isEmpty,
	useEntityLoaded
} from '../../../components/common/useSectionSettingsHeader';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faSliders,
	faRulerHorizontal
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../data/cycleTypes';
import {isScalingValid} from '../../../data/analogTypes';
import {
	loadSensor,
	saveSensor
} from '../../../../module/process/infrasctructure/store/actions/sensor';
import SensorGeneralSettingsSection from './SensorGeneralSettingsSection';
import SensorConfigurationSettingsSection from './SensorConfigurationSettingsSection';
import SensorDataSourceSettingsSection, {
	hasDataSource as sensorHasDataSource,
	isDeviceCommandType
} from './SensorDataSourceSettingsSection';
import SensorAnalogScalingSection from './SensorAnalogScalingSection';
import {generalContainerStyle} from '../../../components/common/GeneralSettingsFields';
import i18n from 'i18next';

function SensorSettingsScreen(props: any) {
	const isNew = !props.route.params?.id;
	const sensorRef = useRef(props.sensor);
	sensorRef.current = props.sensor;
	const generalLoaded = useEntityLoaded(props.sensor, props.route.params?.id);

	const _deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		// Suppression : on tague le sensor `delete: true` (+ `isModified`) sur la
		// ref et on sort. La persistance se fait via la sauvegarde silencieuse du
		// header (`beforeRemove`), comme pour les cycles — sinon un second save
		// déclenché par le retour ré-enregistrerait le sensor sans le flag delete.
		sensorRef.current = {
			...sensorRef.current,
			delete: true,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadSensor(props.route.params?.id);
	}, []);

	const {invalidSections} = useSectionSettingsHeader({
		navigation: props.navigation,
		entity: props.sensor,
		isNew,
		// Pas de bouton save tant que rien n'a été modifié (simple retour).
		backWhenPristine: true,
		// Section General toujours visible : pas de rouge à l'entrée en création.
		deferNewValidation: true,
		hasChanges: () => !!sensorRef.current?.isModified,
		save: onDone => {
			props.saveSensor(sensorRef.current);
			onDone();
		},
		validate: () => {
			const s = sensorRef.current;
			// cronPattern obligatoire pour un FORCAST ou un COM/ANALOG non enfant.
			const cronRequired =
				s?.type === 'FORCAST' ||
				(isDeviceCommandType(s?.type) &&
					!s?.isChild &&
					s?.parentId == null);
			return {
				general: isEmpty(s?.name) || isEmpty(s?.style),
				configuration:
					cronRequired && isEmpty(s?.config?.cronPattern),
				// Un sensor ANALOG n'est exploitable qu'avec une échelle complète.
				scaling:
					s?.type === 'ANALOG' && !isScalingValid(s?.config?.scaling)
			};
		}
	});

	// Configuration : un sensor COM/ANALOG relié à une commande d'appareil
	// (parent) ou à un parent (enfant) affiche sa source de données ; les
	// autres (FORCAST, nouveau sensor…) gardent le formulaire de configuration.
	const s = sensorRef.current;
	const hasDataSource = sensorHasDataSource(s);

	return (
		<SettingsScrollView>
			{/* Général sorti du menu : sans carte blanche, en première position. Son
			    formulaire lit ses valeurs au montage : on attend le chargement. */}
			{generalLoaded ? (
				<View style={generalContainerStyle}>
					<SensorGeneralSettingsSection
						embedded
						sensorData={sensorRef.current}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</View>
			) : null}
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={51}
					name={i18n.t('common:sections.configuration')}
					icon={faSliders}
					invalid={invalidSections.configuration}
					onPress={() => {}}>
					{hasDataSource ? (
						<SensorDataSourceSettingsSection
							key={s?.id}
							sensorData={s}
							navigation={props.navigation}
						/>
					) : (
						<SensorConfigurationSettingsSection
							embedded
							sensorData={sensorRef.current}
							showErrors={invalidSections.configuration}
							navigation={props.navigation}
						/>
					)}
				</MenuAccordion>
				{s?.type === 'ANALOG' ? (
					<MenuAccordion
						key={55}
						name={i18n.t('sensor:analog.scaling')}
						icon={faRulerHorizontal}
						invalid={invalidSections.scaling}
						onPress={() => {}}>
						<SensorAnalogScalingSection
							key={s?.id}
							sensorData={s}
							showErrors={invalidSections.scaling}
						/>
					</MenuAccordion>
				) : null}
				{/* Créé automatiquement par la box (`autoCreated`) : non supprimable. */}
				{props.sensor?.autoCreated ? null : (
					<DeleteItemMenu
						key={61}
						OnConfirm={() => {
							_deleteItem();
						}}
					/>
				)}
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
	sensor: state.root_sensor.sensor
});

export default connect(mapStateToProps, {
	loadSensor,
	saveSensor
})(SensorSettingsScreen);
