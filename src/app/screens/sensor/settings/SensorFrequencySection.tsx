import React, {useEffect} from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {SettingsScrollView} from '../../../components/common/SettingsScrollView';
import {updateSensor} from '../../../../module/process/infrasctructure/store/actions/sensor';
import {NewSchedulingSection} from '../../cycle/schedules/settings/schedule/NewSchedulingSection';

// Fréquence de lecture d'un sensor parent (config.cronPattern), construite avec
// le même builder cron que les schedules des cycles (sans date ponctuelle ni
// déclencheur solaire). Les changements sont stagés sur le sensor en cours
// d'édition ; la sauvegarde reste celle de l'écran Sensor Settings.
export function SensorFrequencySection(props: any) {
	const sensorRef = React.useRef(props.sensor);
	sensorRef.current = props.sensor;

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
	}, []);

	return (
		<SettingsScrollView>
			<View style={BoxFormStyle.boxForm}>
				<NewSchedulingSection
					cronOnly
					hidePreview
					cron={{pattern: props.sensor?.config?.cronPattern}}
					onChange={(dto: any) =>
						props.updateSensor({
							...sensorRef.current,
							config: {
								...sensorRef.current?.config,
								cronPattern: dto.pattern
							},
							isModified: true
						})
					}
				/>
			</View>
		</SettingsScrollView>
	);
}

const mapStateToProps = (state: any) => ({
	sensor: state.root_sensor.sensor
});

export default connect(mapStateToProps, {
	updateSensor
})(SensorFrequencySection);
