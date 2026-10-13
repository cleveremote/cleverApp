import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../components/common/cycleMenu';
import {
	useSectionSettingsHeader,
	isEmpty
} from '../../../components/common/useSectionSettingsHeader';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faTrafficLight, faSliders} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../data/cycleTypes';
import {
	loadSensor,
	saveSensor
} from '../../../../module/process/infrasctructure/store/actions/sensor';
import SensorGeneralSettingsSection from './SensorGeneralSettingsSection';
import SensorConfigurationSettingsSection from './SensorConfigurationSettingsSection';

function SensorSettingsScreen(props: any) {
	const isNew = !props.route.params?.id;
	const sensorRef = useRef(props.sensor);
	sensorRef.current = props.sensor;

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
		hasChanges: () => !!sensorRef.current?.isModified,
		save: onDone => {
			props.saveSensor(sensorRef.current);
			onDone();
		},
		validate: () => {
			const s = sensorRef.current;
			// cronPattern obligatoire pour un FORCAST ou un COM non enfant.
			const cronRequired =
				s?.type === 'FORCAST' ||
				(s?.type === 'COM' && !s?.isChild);
			return {
				general: isEmpty(s?.name) || isEmpty(s?.style),
				configuration:
					cronRequired && isEmpty(s?.config?.cronPattern)
			};
		}
	});

	return (
		<SettingsScrollView>
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: 'white',
					marginTop: 8,
					marginHorizontal: 20,
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22
				}}>
				<MenuAccordion
					key={41}
					name={'General'}
					icon={faTrafficLight}
					invalid={invalidSections.general}
					onPress={() => {}}>
					<SensorGeneralSettingsSection
						embedded
						sensorData={sensorRef.current}
						showErrors={invalidSections.general}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<MenuAccordion
					key={51}
					name={'Configuration'}
					icon={faSliders}
					invalid={invalidSections.configuration}
					onPress={() => {}}>
					<SensorConfigurationSettingsSection
						embedded
						sensorData={sensorRef.current}
						showErrors={invalidSections.configuration}
						navigation={props.navigation}
					/>
				</MenuAccordion>
				<DeleteItemMenu
					key={61}
					OnConfirm={() => {
						_deleteItem();
					}}
				/>
			</View>
		</SettingsScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	sensor: state.root_sensor.sensor
});

export default connect(mapStateToProps, {
	loadSensor,
	saveSensor
})(SensorSettingsScreen);
