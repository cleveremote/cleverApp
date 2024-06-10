import React from 'react';
import { GestureResponderEvent } from 'react-native';
import { Box, IconButton } from "native-base";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { border } from 'native-base/lib/typescript/theme/styled-system';
import { RotateInDownLeft } from 'react-native-reanimated';

export function navigationHeader(onPress: (event: GestureResponderEvent) => void, icon: string,rotate:boolean=false) {
    return rotate? (
        <Box>
            <IconButton  style={{transform: [{rotate: '135deg'}]}} size={30} icon={<Icon name={icon} size={30} color='#32404e' />}        
                onPress={onPress} />
        </Box>
    ):(
        <Box>
            <IconButton  size={30} icon={<Icon name={icon} size={30} color='#32404e' />}        
                onPress={onPress} />
        </Box>
    );
}

// icon={<FontAwesomeIcon icon={icon} size={30} color={'#60a5fa'} />}