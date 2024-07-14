import React, { useState } from 'react';
import { Flex, IconButton, Box, View, Heading, HStack, Stagger, useDisclose, Text } from 'native-base';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, navigationCycleType } from '../../data/cycleTypes';
import { ModalOverrideDuration } from '../common/modalOverrideDuration';
import { red } from 'react-native-reanimated/lib/typescript/reanimated2/Colors';
import { connect } from 'react-redux';


export function SensorValue(props: any) {
    const fontColor = props.cycleData.style.fontColor;
    const getValue = () => {
        return (props.values || []).find((x: any) => x.id === props.cycleData.id);
    }
    return (
        <Box style={{ justifyContent: 'center', alignItems: 'flex-end' }} rounded="xl" shadow={6} height='40px' width={'60px'} >
           <Text style={{ fontWeight: 'bold' }} alignSelf={'center'} color={fontColor}>{getValue()?.value}{props.cycleData.unit}</Text>
        </Box>
    );
}

const mapStateToProps = (state: any) => ({
    values: state.root_sensor.values
});

export default connect(mapStateToProps, null)(SensorValue);