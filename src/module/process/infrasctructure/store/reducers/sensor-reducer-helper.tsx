import {Pattern} from 'react-native-svg';
import {newTempId} from '../../../../../services/socket';

export const loadSensors = (sensors: any) => {
	return sensors || [];
};

export const loadSensor = (sensors: any, sensorId: string) => {
	if (sensors && sensorId) {
		return sensors.find((x: any) => x.id === sensorId);
	} else {
		return {
			id: newTempId(),
			name: 'new scheduled sensor',
			description: 'new scheduled sensor',
			taskId: '',
			Pattern: '',
			style: {
				bgColor: '#a5f3fc',
				fontColor: '#60a5fa',
				iconColor: {base: '#60a5fa', icon: '#60a5fa'}
			},
			type: 'SCHEDULED',
			unit: 'V',
			isModified: true
		};
	}
};

export const updateSensor = (
	prevSensors: any,
	sensor: any,
	tempId?: string
) => {
	const previous: any[] = tempId
		? prevSensors.filter((x: any) => x.id !== tempId)
		: [...prevSensors];
	if (sensor) {
		const index = previous.findIndex(x => x.id === sensor?.id);
		if (index > -1) {
			// La réponse de sync ne renvoie pas les champs résolus du fetch
			// complet (deviceCommand, model…) : on fusionne avec le sensor connu
			// au lieu de le remplacer, sinon la section Configuration se vide
			// jusqu'au prochain refresh. Si la commande liée a changé, on ne
			// garde pas une deviceCommand / un model périmés.
			const prev = previous[index];
			const sameCommand =
				`${prev?.config?.commandId}` === `${sensor?.config?.commandId}`;
			previous[index] = {
				...prev,
				...sensor,
				deviceCommand:
					sensor.deviceCommand ??
					(sameCommand ? prev?.deviceCommand : undefined),
				model: sensor.model ?? (sameCommand ? prev?.model : undefined),
				isModified: false
			};
		} else {
			previous.push(sensor);
		}
	}
	return previous;
};

export const updateStatus = (prevSensors: any, status: any) => {
	if (status?.length) {
		return status;
	}
	if (status.type === 'SENSOR') {
		const values = [...prevSensors];
		const index = values.findIndex(x => x.id === status.id);
		if (index > -1) {
			values[index] = {...values[index], value: status.value};
		} else {
			values.push(status);
		}

		return values;
	}
	return [];
};
