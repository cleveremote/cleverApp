import {newTempId} from '../../../../../services/socket';

export const loadSchedules = (cycle: any) => {
	return cycle?.schedules || [];
};

export const loadSchedule = (
	schedules: any,
	scheduleId: string,
	cycleId: string
) => {
	if (scheduleId) {
		return schedules.find((x: any) => x.id === scheduleId);
	} else if (cycleId) {
		return {
			id: newTempId(),
			cycleId: cycleId,
			name: 'new schedule',
			description: 'new schedule',
			cron: {
				pattern: '*/30 * * * * *',
				date: Date.now()
			},
			shouldConfirmation: true,
			isPaused: true,
			isModified: true
		};
	} else {
		return null;
	}
};

export const updateSchedule = (
	prevSchedules: any,
	schedule: any,
	tempId?: string
) => {
	const previous: any[] = tempId
		? prevSchedules.filter((x: any) => x.id !== tempId)
		: [...prevSchedules];
	if (schedule) {
		const index = previous.findIndex(x => x.id === schedule?.id);
		if (index > -1) {
			previous[index] = schedule;
		} else {
			previous.push(schedule);
		}
	}
	return previous;
};
