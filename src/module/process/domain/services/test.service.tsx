export const updateStatus = (prevCycles: any, statusData: any) => {
    const cycles = [...prevCycles];
    const status = JSON.parse(statusData);
    let sequences: any[] = [];
    if (status.type === 'CYCLE') {
        const index = cycles.findIndex(x => x.id === status.id);
        const startIndex = (cycles[index].progression?.startIndex || 0);
        const step = ((100) / ((status.duration) / 1000));
        cycles[index] = { ...cycles[index], status: status.status, progression: status.status === 'STOPPED' ? undefined : { startIndex: startIndex > 100 ? 100 : startIndex, step } };
        if (status.overridedDuration) {
            sequences = [...cycles[index].sequences];
            sequences.forEach(seq => {
                seq.overridedDuradion = status.overridedDuration;
            });
            cycles[index] = { ...cycles[index], sequences: sequences};
        } else {
            sequences = [...cycles[index].sequences];
            sequences.forEach(seq => {
                seq.overridedDuradion = undefined;
            });
            cycles[index] = { ...cycles[index], sequences: sequences};
        }
    } else {

        for (const cycle of cycles) {
            let duration = 0;
            cycle.sequences.forEach((x: any) => duration = duration + x.maxDuration);
            const seqIndex = cycle.sequences.findIndex((x: any) => x.id === status.id);
            if (seqIndex > -1) {
                sequences = [...cycle.sequences];
                sequences[seqIndex] = { ...sequences[seqIndex], status: status.status, progression: status.status === 'STOPPED' ? undefined : { startedAt: status.startedAt, duration: status.duration } };
                const index = cycles.findIndex(x => x.id === cycle.id);
                if (status.status === 'STOPPED') {
                    const startIndex = (cycle.progression?.startIndex || 0) + (status.duration * 100 / duration);
                    const step = ((100) / ((duration) / 1000));
                    cycles[index] = { ...cycle, sequences: sequences, progression: { ...cycle.progression, startIndex: startIndex > 100 ? 100 : startIndex, step } };
                } else {
                    cycles[index] = { ...cycle, sequences: sequences };
                }


                break;
            }
        }
    }
    return cycles;
}

function getTimerParams(now: Date, startDate: Date) {
    const date1utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    const date2utc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
    //day = 1000 * 60 * 60 * 24;
    const res = (date1utc - date2utc)
    return res;
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