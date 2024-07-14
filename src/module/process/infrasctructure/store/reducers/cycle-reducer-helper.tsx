

export const loadCycles = (cycles: any) => {
    return cycles || [];
}

export const loadCycle = (cycles: any, cycleId: string) => {
   console.log("loadCycle",cycleId);
    if (cycleId) {
        return cycles.find((x: any) => x.id === cycleId);
    } else {
        return {
            id: `${Math.random()}`,
            name: "new cycle",
            description: "new cycle",
            style: {
                bgColor: "cyan.200",
                fontColor: "blue.400",
                iconColor: { base: "blue", icon: "#60a5fa" }
            },
            modePriority: [{ mode: "MANUAL", priority: 0 }, { mode: "TRIGGER", priority: 1 }, { mode: "SCHEDULE", priority: 2 }],
            sequences: [],
            isModified: true
        }
    }
}

export const updateCycle = (prevCycles: any, cycle: any) => {
    const previous = [...prevCycles];
    if (cycle) {
        const deleteId = cycle?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || cycle?.id))
        if (index > -1) {
            previous[index] = cycle;
        } else {
            previous.push(cycle);
        }
    }
    return previous;
}

export const updateStatus = (prevCycles: any, status: any) => {
    const cycles = [...prevCycles];
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
            cycles[index] = { ...cycles[index], sequences: sequences };
        } else {
            sequences = [...cycles[index].sequences];
            sequences.forEach(seq => {
                seq.overridedDuradion = undefined;
            });
            cycles[index] = { ...cycles[index], sequences: sequences };
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