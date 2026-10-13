import {newTempId} from '../../../../../services/socket';

export const loadModbusConnections = (modbusConnections: any) => {
	return modbusConnections || [];
};

export const loadModbusConnection = (
	modbusConnections: any,
	modbusConnectionId: string
) => {
	if (modbusConnectionId) {
		return modbusConnections.find((x: any) => x.id === modbusConnectionId);
	} else {
		return {
			id: newTempId(),
			ipAddress: '192.168.1.200',
			protocol: 'TCP',
			port: 501,
			slaveId: 1,
			isModified: true
		};
	}
};

export const updateModbusConnection = (
	prevCycles: any,
	cycle: any,
	tempId?: string
) => {
	const previous: any[] = tempId
		? prevCycles.filter((x: any) => x.id !== tempId)
		: [...prevCycles];
	if (cycle) {
		const index = previous.findIndex(x => x.id === cycle?.id);
		if (index > -1) {
			previous[index] = cycle;
		} else {
			previous.push(cycle);
		}
	}
	return previous;
};
