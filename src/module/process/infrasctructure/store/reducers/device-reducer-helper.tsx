import {newTempId} from '../../../../../services/socket';

export const loadDevices = (devices: any) => {
	return devices || [];
};

export const loadDevice = (
	devices: any,
	deviceId: string,
	defaults?: Record<string, any>
) => {
	if (deviceId) {
		return devices.find((x: any) => x.id === deviceId);
	} else {
		// Create branch: seed a fresh temp entity, letting callers inject
		// discriminators such as `type: 'MASTER'` or `type: 'SLAVE' +
		// masterDeviceId` so the new device lands in the right list.
		return {
			id: newTempId(),
			isModified: true,
			...defaults
		};
	}
};

export const updateDevice = (prevDevices: any, device: any, tempId?: string) => {
	const previous: any[] = tempId
		? prevDevices.filter((x: any) => x.id !== tempId)
		: [...prevDevices];
	if (device) {
		const index = previous.findIndex(x => x.id === device?.id);
		if (index > -1) {
			previous[index] = device;
		} else {
			previous.push(device);
		}
	}
	return previous;
};
