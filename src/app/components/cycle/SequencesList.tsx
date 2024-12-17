import React, { useEffect, useState } from 'react';
import { Box } from 'native-base';
import { connect } from 'react-redux';
import SequenceStack from './sequenceStack';


export function SeqeuncesList(props: any) {
    const [status, setStatus] = useState("");

    const getStatus = () => {
        const st = (props.status || []).find((x: any) => x.id === props.cycleData.id);
        return st?.status || "STOPPED";
    }


    useEffect(() => {
       setStatus(getStatus());
    }, [props.status])

    return (
        status === 'IN_PROCCESS' ?
            props.cycleData.sequences.map((sequence: any, index: number) => <Box key={'sequence_' + index} marginLeft={5} marginTop={2}>
                <SequenceStack navigation={props.navigation} cycleId={props.cycleData.id} item={sequence} isActive={false} onSkip={() => props.onSkip(sequence.id)} stackParent={true} />
            </Box>) : null

    );
}

const mapStateToProps = (state: any) => ({
    status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(SeqeuncesList);