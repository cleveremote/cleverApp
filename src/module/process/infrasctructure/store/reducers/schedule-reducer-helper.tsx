

export const loadSchedules = (cycle: any) => {
    return cycle?.schedules || [];
}

export const loadSchedule = (schedules: any, scheduleId: string, cycleId: string) => {
    if (scheduleId) {
        return schedules.find((x: any) => x.id === scheduleId);
    } else if (cycleId) {
        return {
            id: `${Math.random()}`,
            cycleId: cycleId,
            name: "new schedule",
            description: "new schedule",
            cron: {
                pattern: "*/30 * * * * *"
            },
            shouldConfirmation: true,
            isPaused: true,
            isModified: true
        }
    } else {
        return null;
    }

}

export const updateSchedule = (prevSchedules: any, schedule: any) => {
    const previous = [...prevSchedules];
    if (schedule) {
        const deleteId = schedule?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || schedule?.id))
        if (index > -1) {
            previous[index] = schedule;
        } else {
            previous.push(schedule);
        }
    }
    return previous;
}