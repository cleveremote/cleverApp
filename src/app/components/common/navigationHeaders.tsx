import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { Box, IconButton, View } from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { border } from 'native-base/lib/typescript/theme/styled-system';
import { RotateInDownLeft } from 'react-native-reanimated';
import Logo from "../../../../hydrophyto.svg";

export function navigationHeader(onPress: (event: GestureResponderEvent) => void, icon: string, rotate: boolean = false) {
    return rotate ? (
        <Box>
            <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" style={{ transform: [{ rotate: '135deg' }] }} size={35} icon={<Icon name={icon} size={30} color='#32404e' />}
                onPress={onPress} />
        </Box>
    ) :
        (
            <Box>
                <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" size={35} icon={<Icon name={icon} size={30} color='#32404e' />}
                    onPress={onPress} />
            </Box>
        );
}


export function brandLogo() {
    return (
        <View >
            <Logo width={"35"} height={"35"} />
        </View>
    )
}