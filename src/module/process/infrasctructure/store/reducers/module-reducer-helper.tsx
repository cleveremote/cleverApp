export const loadModules = (sequence: any) => {
	return sequence?.modules || [];
};

export const updateModule = (prevModules: any, module: any) => {
	const previous = [...prevModules];
	if (module) {
		const moduleDto = {
			id: module.portNum,
			portNum: module.portNum,
			isModified: module.isModified
		};
		const deleteId = moduleDto?.id.split('_');
		const index = previous.findIndex(
			x => x.id === (deleteId[1] || moduleDto?.id)
		);
		if (index > -1) {
			previous[index] = moduleDto;
		} else {
			previous.push(moduleDto);
		}
	}
	return previous;
};

export const loadDevices = (sequence: any) => {
	return sequence?.devices || [];
};

export const updateDevice = (prevDevices: any, device: any) => {
	const previous = [...prevDevices];
	if (device) {
		const deleteId = `${device.id}`.split('_');
		const index = previous.findIndex(
			x => x.id === (deleteId[1] || device?.id)
		);
		if (index > -1) {
			// Merge so a value change keeps deviceId/label, and a delete marker
			// (`deleted_<id>`) replaces the existing entry's id.
			previous[index] = {...previous[index], ...device};
		} else {
			previous.push(device);
		}
	}
	return previous;
};
