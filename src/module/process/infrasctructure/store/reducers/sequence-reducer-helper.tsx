import {newTempId} from '../../../../../services/socket';

export const loadSequences = (cycle: any) => {
	return cycle?.sequences || [];
};

export const loadSequence = (sequences: any, sequenceId: string) => {
	if (sequenceId) {
		return sequences.find((x: any) => x.id === sequenceId);
	} else {
		return {
			id: newTempId(),
			name: 'new sequence',
			description: 'new sequence',
			securityConfig: {
				maxDuration: 50000
			},
			isModified: true
		};
	}
};

export const updateSequence = (prevSequences: any, sequence: any) => {
	const previous = [...prevSequences];
	if (sequence) {
		const index = previous.findIndex(x => x.id === sequence?.id);
		if (index > -1) {
			previous[index] = sequence;
		} else {
			previous.push(sequence);
		}
	}
	return previous;
};
