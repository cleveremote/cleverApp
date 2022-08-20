export const updateStatus = (prevCycles: any, statusData: any) => {
    const cycles = [...prevCycles];
    const status = JSON.parse(statusData);
    if (status.type === 'CYCLE') {

       const index = cycles.findIndex(x=> x.id === status.id);
       cycles[index] = {...cycles[index],status:status.status,progression:{startedAt:status.startedAt,duration:status.duration}};
    }
    return cycles;
}

export const updateSequenceConfiguration = (sequence: any) => {

    return sequence;
}

export const executeCycle = (sequence: any) => {

    return sequence;
}

export const updateSModuleConfiguration = (module: any) => {

    return module;
}

export const getProcesses = (configuration: string) => {
    const processes: any[] = [];
    if (configuration) {
        const objConfig = JSON.parse(configuration);

        objConfig.cycles.forEach((cycle: any) => {
            processes.push(cycle);
        });
    }

    return processes;
}

export const updateCycles = (cycles: any[], cycle: string) => {
    const previous = [...cycles];
    const processes = [];
    if (cycle) {
        const objCycle = JSON.parse(cycle);
        if (objCycle.update) {
            const index = previous.findIndex(x => x.id === objCycle.cycle.id)
            if (index > -1) {
                if (objCycle.cycle.shouldDelete) {
                    previous.splice(index, 1);
                } else {
                    previous[index] = objCycle.cycle;
                }
            } else {
                previous.push(objCycle.cycle);
            }
        }

        previous.forEach(c => {
            processes.push(c);
        });
    }

    return previous;
}

export const dispatchto = (cycles: any, payload: any) => {
    const objCycle = JSON.parse(payload)
    return objCycle.update ? updateCycles(cycles, payload) : getProcesses(payload)
}