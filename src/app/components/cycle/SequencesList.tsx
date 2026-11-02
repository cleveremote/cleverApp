import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';
import SequenceStack from './sequenceStack';
import CycleNotification from './CycleNotification';
import i18n from 'i18next';

const IN_PROCESS = 'IN_PROCCESS';

export function SeqeuncesList(props: any) {
	const [status, setStatus] = useState('');

	const getStatus = () => {
		const st = (props.status || []).find(
			(x: any) => x.id === props.cycleData.id
		);
		return st?.status || 'STOPPED';
	};

	useEffect(() => {
		setStatus(getStatus());
	}, [props.status, props.cycleData.id]);

	const sequences: any[] = props.cycleData.sequences || [];
	const statusOf = (id: string) =>
		(props.status || []).find((x: any) => x?.id === id)?.status;

	// Une séquence dont les conditions ne sont pas vérifiées est sautée : le
	// box démarre la suivante vérifiée. Forcer la met en file : elle démarre
	// à la fin de la séquence en cours, s'il y en a une.
	const runningSequence = (sequenceId: string) =>
		sequences.find(
			(x: any) => x.id !== sequenceId && statusOf(x.id) === IN_PROCESS
		);

	return status === 'IN_PROCCESS'
		? sequences.map((sequence: any, index: number) => {
				const running = runningSequence(sequence.id);
				return (
					<View key={'sequence_' + index} style={{marginLeft: 20, marginTop: 8}}>
						<SequenceStack
							navigation={props.navigation}
							cycleId={props.cycleData.id}
							item={sequence}
							isActive={false}
							onSkip={() => props.onSkip(sequence.id)}
							stackParent={true}
						/>
						<CycleNotification
							item={sequence}
							onForce={() => props.onForceSequence(sequence.id)}
							forceLabel={i18n.t('cycle:notification.forceAndQueue')}
							forceHint={
								running
									? i18n.t('cycle:notification.willStartAfter', {
											name: running.name
									  })
									: undefined
							}
						/>
					</View>
				);
		  })
		: null;
}

const mapStateToProps = (state: any) => ({
	status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(SeqeuncesList);
