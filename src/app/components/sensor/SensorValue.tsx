import React from 'react';
import {Text} from 'react-native';
import {connect} from 'react-redux';

// Unité d'un sensor : `config.unit` si renseignée, sinon celle du champ lu
// (`config.field`) dans la commande de l'appareil — le backend ne renvoie pas
// d'unité propre pour les mesures issues d'une commande. Un ANALOG affiche la
// valeur convertie : l'unité de son échelle prime.
export const getSensorUnit = (sensor: any): string => {
	if (sensor?.type === 'ANALOG' && sensor?.config?.scaling?.unit) {
		return sensor.config.scaling.unit;
	}
	if (sensor?.config?.unit) return sensor.config.unit;
	const fieldName = sensor?.config?.field;
	if (!fieldName) return '';
	const fields = sensor?.deviceCommand?.params?.result?.fields || [];
	return fields.find((f: any) => f.name === fieldName)?.unit || '';
};

export function SensorValue(props: any) {
	const fontColor = props.cycleData.style.fontColor;
	const getValue = () => {
		return (props.values || []).find(
			(x: any) =>
				x.id === props.cycleData.id || x.deviceId === props.cycleData.id
		);
	};
	return (
		<Text
			style={{
				fontWeight: 'bold',
				fontSize: 15, // même taille que le nom du sensor (SensorStack)
				color: fontColor,
				textShadowColor: '#737171',
				textShadowOffset: {width: 1, height: 0},
				textShadowRadius: 1
			}}>
			{(getValue()?.value || '_') +' '}
			<Text style={{fontWeight: 'normal'}}>
				{getSensorUnit(props.cycleData)}
			</Text>
		</Text>
	);
}

const mapStateToProps = (state: any) => ({
	values: state.root_sensor.values
});

export default connect(mapStateToProps, null)(SensorValue);
