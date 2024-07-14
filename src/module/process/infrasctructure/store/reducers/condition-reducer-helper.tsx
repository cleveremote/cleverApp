

export const loadConditions = (trigger: any) => {
    return trigger?.conditions || [];
}

export const loadCondition = (conditions: any, conditionId: string, triggerId: string) => {
    console.log(conditionId,triggerId);
    if (conditionId) {
        return conditions.find((x: any) => x.id === conditionId);
    } else if (triggerId) {
        return {
            id: `${Math.random()}`,
            triggerId: triggerId,
            name: "new condition",
            description: "new condition",
            deviceId: "",
            operator: '<',
            value: 50
        }
    } else {
        return null;
    }
}

export const updateCondition = (prevConditions: any, condition: any) => {
    const previous = [...prevConditions];
    console.log("previous",previous,condition);
    if (condition) {
        const deleteId = condition?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || condition?.id))
        if (index > -1) {
            previous[index] = condition;
        } else {
            previous.push(condition);
        }
    }
    
    return previous;
}