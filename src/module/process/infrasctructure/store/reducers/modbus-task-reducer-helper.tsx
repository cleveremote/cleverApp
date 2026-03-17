export const loadModbusTasks = (modbusTasks: any) => {
	console.log('modbusTasks', modbusTasks);
	return modbusTasks || [];
};

export const loadModbusTask = (modbusTasks: any, modbusTaskId: string) => {
	if (modbusTaskId) {
		return modbusTasks.find((x: any) => x.id === modbusTaskId);
	} else {
		return {
			id: `${Math.random()}`,
			ipAddress: '192.168.1.200',
			protocol: 'TCP',
			port: 501,
			slaveId: 1,
			isModified: true
		};
	}
};

export const updateModbusTask = (prevCycles: any, cycle: any) => {
	const previous = [...prevCycles];
	if (cycle) {
		const deleteId = cycle?.id.split('_');
		const index = previous.findIndex(
			x => x.id === (deleteId[1] || cycle?.id)
		);
		if (index > -1) {
			previous[index] = cycle;
		} else {
			previous.push(cycle);
		}
	}
	return previous;
};
