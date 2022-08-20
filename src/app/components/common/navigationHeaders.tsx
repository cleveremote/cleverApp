import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { Box, IconButton } from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";

export function navigationHeader(onPress: (event: GestureResponderEvent) => void, icon: IconDefinition) {
    return (
        <Box>
            <IconButton size={30} icon={<FontAwesomeIcon icon={icon} size={30} color={'#60a5fa'} />}
                onPress={onPress} />
        </Box>
    );
}