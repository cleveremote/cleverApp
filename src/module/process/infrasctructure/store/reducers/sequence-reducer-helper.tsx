import {newTempId} from '../../../../../services/socket';
import i18n from 'i18next';

export const loadSequences = (cycle: any) => {
	return cycle?.sequences || [];
};

export const loadSequence = (sequences: any, sequenceId: string) => {
	if (sequenceId) {
		return sequences.find((x: any) => x.id === sequenceId);
	} else {
		return {
			id: newTempId(),
			name: i18n.t('common:defaults.newSequence'),
			description: i18n.t('common:defaults.newSequence'),
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
