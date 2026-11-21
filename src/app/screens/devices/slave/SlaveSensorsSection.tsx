import {fieldLabelColor} from '../../../styles/components/common/Input';
import React, {useEffect, useState} from 'react';
import i18n from 'i18next';
import {StyleSheet, Text, View} from 'react-native';
import {connect} from 'react-redux';
import {SensorStack} from '../../../components/sensor/SensorStack';
import {loadSensors} from '../../../../module/process/infrasctructure/store/actions/sensor';
import {sensorDeviceIds} from '../../../../module/process/infrasctructure/store/models/deviceConnectivity';
import {findModel, modelKind} from './SlaveModelSection';

// Kinds de modèle pour lesquels un slave est lu par des sensors : seuls
// ceux-là affichent la section « Sensors ».
export const SENSOR_MODEL_KINDS = ['FLOWMETER_V1', 'ANALOG_INPUT_8CH'];

export const hasSensorsSection = (models: any[], device: any) =>
	SENSOR_MODEL_KINDS.includes(modelKind(findModel(models, device)) ?? '');

// Même liste que l'onglet Sensors, restreinte aux sensors qui lisent ce slave
// (un enfant hérite du device de son parent). Embarquée dans l'accordéon
// « Sensors » du slave.
export function SlaveSensorsSection(props: any) {
	const deviceId = `${props.device?.id}`;
	const [activeMenu, setActiveMenu] = useState<string>();
	const [collapsed, setCollapsed] = useState<string[]>([]);

	useEffect(() => {
		// Rechargé au retour sur le slave pour refléter les éditions faites dans
		// le menu du sensor.
		props.loadSensors();
		const unsubscribe = props.navigation.addListener('focus', () => {
			props.loadSensors();
		});
		return unsubscribe;
	}, []);

	const ctx = {sensors: props.sensors, modbusTasks: props.modbusTasks};
	const visibleSensors = (props.sensors ?? []).filter(
		// Contrairement à l'onglet Sensors, les sensors masqués (display false)
		// sont listés : c'est ici qu'on retrouve tout ce que lit le slave.
		(x: any) => !x.delete && sensorDeviceIds(x, ctx).includes(deviceId)
	);
	const getParentId = (sensor: any) => sensor.parentId ?? sensor.parent?.id;
	const isNestedChild = (sensor: any) => {
		const parentId = getParentId(sensor);
		return (
			parentId != null &&
			`${parentId}` !== `${sensor.id}` &&
			visibleSensors.some((x: any) => `${x.id}` === `${parentId}`)
		);
	};
	const rootSensors = visibleSensors.filter((x: any) => !isNestedChild(x));
	const getChildren = (parent: any) =>
		visibleSensors.filter(
			(x: any) =>
				isNestedChild(x) && `${getParentId(x)}` === `${parent.id}`
		);
	const toggleCollapsed = (id: string) =>
		setCollapsed(prev =>
			prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
		);
	const closeSibillings = (isExpended: boolean, current?: string) =>
		setActiveMenu(isExpended ? current : undefined);

	const renderSensor = (sensor: any, extra: any = {}) => (
		<SensorStack
			cycleData={sensor}
			navigation={props.navigation}
			current={activeMenu}
			closeSibillings={closeSibillings}
			settingsRoute="SensorSettingsStack"
			{...extra}
		/>
	);

	return (
		<View style={styles.embeddedCard}>
			{rootSensors.length === 0 ? (
				<Text style={styles.empty}>{i18n.t('devices:noSensor')}</Text>
			) : (
				rootSensors.map((sensor: any) => {
					const children = getChildren(sensor);
					const isExpanded = !collapsed.includes(`${sensor.id}`);
					return (
						<View key={'sensor_' + sensor.id}>
							{renderSensor(sensor, {
								isParent: children.length > 0,
								isExpanded,
								onToggleExpand: () =>
									toggleCollapsed(`${sensor.id}`)
							})}
							{isExpanded &&
								children.map((child: any) => (
									<View
										key={'sensor_' + child.id}
										style={styles.child}>
										{renderSensor(child)}
									</View>
								))}
						</View>
					);
				})
			)}
		</View>
	);
}

const COLORS = {
	muted: fieldLabelColor,
	cardBackground: 'white'
};

const styles = StyleSheet.create({
	// Embarqué dans l'accordéon (déjà une carte blanche) : pas d'ombre ni de
	// marge, juste un peu de padding autour de la liste.
	embeddedCard: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		gap: 8,
		padding: 8,
		paddingBottom: 16
	},
	child: {
		marginLeft: 20,
		marginTop: 8
	},
	empty: {
		color: COLORS.muted,
		paddingVertical: 8,
		paddingHorizontal: 8
	}
});

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors,
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {loadSensors})(SlaveSensorsSection);
