

export const loadTriggers = (cycle: any) => {
    return cycle?.triggers || [];
}

export const loadTrigger = (triggers: any, triggerId: string, cycleId: string) => {
    console.log("testload", triggers, triggerId, cycleId)
    if (triggerId) {
        return triggers.find((x: any) => x.id === triggerId);
    } else if (cycleId) {
        return {
            id: `${Math.random()}`,
            cycleId: cycleId,
            name: "new trigger",
            description: "new trigger",
            action: "ON",
            delay: 5000,
            trigger: { timeAfter: 5000 },
            shouldConfirmation: true,
            isPaused: true,
            isModified: true
        }
    } else {
        return null;
    }

}

export const updateTrigger = (prevTriggers: any, trigger: any) => {
    const previous = [...prevTriggers];
    if (trigger) {
        const deleteId = trigger?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || trigger?.id))
        if (index > -1) {
            console.log("trigger",trigger);
            previous[index] = trigger;
        } else {
            previous.push(trigger);
        }
    }
    return previous;
}