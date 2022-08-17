import { useDispatch } from "react-redux";


export const updateConfiguration = (currentConfiguration: any, status: any) => {
    const test = JSON.parse(JSON.stringify(currentConfiguration));
    test[0].name = '1234';

    return test;
}

export const updateSequenceConfiguration = (sequence) => {

    return sequence;
}

export const updateSModuleConfiguration = (module) => {

    return module;
}



export const getProcesses = (configuration: string) => {
    const processes = [];
    if (configuration) {
        const objConfig = JSON.parse(configuration);

        objConfig.cycles.forEach(cycle => {
            processes.push(cycle);
        });
    }

    return processes;
}

export const updateCycles = (cycles, cycle: string) => {
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

export const dispatchto = (cycles, payload) => {
    const objCycle = JSON.parse(payload)
    return objCycle.update ? updateCycles(cycles, payload) : getProcesses(payload)
}