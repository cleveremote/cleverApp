

export const loadSequences = (cycle: any) => {
    return cycle?.sequences || [];
}

export const loadSequence = (sequences: any, sequenceId: string) => {
    console.log("loadSequence",sequenceId,sequences)
    if (sequenceId) {
        
        return sequences.find((x: any) => x.id === sequenceId);
    } else {
        return {
            id: `${Math.random()}`,
            name: "new sequence",
            description: "new sequence",
            maxDuration:50000,
            isModified: true
        }
    } 
}

export const updateSequence = (prevSequences: any, sequence: any) => {
    const previous = [...prevSequences];
    if (sequence) {
        const deleteId = sequence?.id.split('_');
        const index = previous.findIndex(x => x.id === (deleteId[1] || sequence?.id))
        if (index > -1) {
            previous[index] = sequence;
        } else {
            previous.push(sequence);
        }
    }
    return previous;
}