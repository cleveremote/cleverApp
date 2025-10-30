import React, { useEffect, useState } from 'react';
import { IconButton, Box, HStack, Switch, View } from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { hapticOptions } from '../../data/cycleTypes';
import { connect } from 'react-redux';


export function SensorStatus(props: any) {
    const [status, setStatus] = useState("");

    const getStatus = () => {
        const st = (props.status || []).find((x: any) => x.id === props.cycleData.id);
        if (st) {
            return st.status;
        }
        return ""
    }


    useEffect(() => {
       setStatus(getStatus());
       props.closeSibillings(true);
    }, [props.status])
    return (
            <Box style={{ alignItems: 'flex-end' }} >
                {status === 'WAITTING_CONFIRMATION' ? (<HStack space={3} alignItems="center" ml={'0'} >
                    <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon name="check-circle" size={25} color='green' />}
                        onLongPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.onSwitch(true, 'FORCE');
                        }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        }} />
                    <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon name="times-circle" size={25} color='red' />}
                        onLongPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.onSwitch(false, 'IGNORE');
                        }} />
                    <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" size={30} icon={<Icon name="arrow-alt-circle-right" size={25} color='orange' />}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        }} />
                </HStack>) : <Switch mt={0.5} isChecked={status === 'IN_PROCCESS'} onTrackColor={props.iconColorSwitch + ".400"} offThumbColor={props.iconColorSwitch + ".50"} size={'md'}  onValueChange={(value) => { props.closeSibillings(true); props.onSwitch(value, 'INIT'); setStatus(value ? 'IN_PROCCESS' : 'STOPPED'); }} />}
            </Box>
    );
}

const mapStateToProps = (state: any) => ({
    status: state.root_cycle.status
});

export default connect(mapStateToProps, null)(SensorStatus);