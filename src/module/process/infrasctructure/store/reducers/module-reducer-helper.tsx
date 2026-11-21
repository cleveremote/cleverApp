export const loadModules = (sequence: any) => {
	return sequence?.modules || [];
};

export const updateModule = (prevModules: any, module: any) => {
	const previous = [...prevModules];
	if (module) {
		const moduleDto = {
			id: module.portNum,
			portNum: module.portNum,
			delete: module.delete,
			isModified: module.isModified
		};
		const index = previous.findIndex(x => x.id === moduleDto?.id);
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

// Module refs of a sequence (persisted as `moduleConfigs`), unified across the
// RPI/COM/CTRL master actuators they point at. Each entry follows
// `SequenceModuleRef` (`{ moduleId, configTiming, customValue? }`) and carries
// `name`/`type` for display.
export const loadSequenceModuleConfigs = (sequence: any) => {
	return sequence?.moduleConfigs || [];
};

export const updateSequenceModuleConfig = (
	prevModuleConfigs: any,
	moduleConfig: any
) => {
	const previous = [...prevModuleConfigs];
	if (moduleConfig) {
		const index = previous.findIndex(
			x => x.moduleId === moduleConfig?.moduleId
		);
		if (index > -1) {
			// Merge so a timing/customValue change keeps name/type, and a delete
			// (`delete: true`) marks the existing entry for removal on save.
			previous[index] = {...previous[index], ...moduleConfig};
		} else {
			previous.push(moduleConfig);
		}
	}
	return previous;
};

export const updateDevice = (prevDevices: any, device: any) => {
	const previous = [...prevDevices];
	if (device) {
		const index = previous.findIndex(x => x.id === device?.id);
		if (index > -1) {
			// Merge so a value change keeps deviceId/label, and a delete
			// (`delete: true`) marks the existing entry for removal on save.
			previous[index] = {...previous[index], ...device};
		} else {
			previous.push(device);
		}
	}
	return previous;
};
