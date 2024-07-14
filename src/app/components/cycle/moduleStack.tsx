import React from 'react';
import { Box, Flex, IconButton, Progress, Text } from "native-base";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../styles/cycleStyles';
import { hapticOptions } from '../../data/cycleTypes';


export function elementStack(item: any, actionElement: Function, label: string, icon: { name: IconDefinition, color: string }) {
    return (
        <Box alignSelf="stretch" bg={'white'} rounded="xl" shadow={3} m={1} key={item.key}>
            <Flex direction="row">
                <Text flex={1} alignSelf={'flex-start'} style={styles.textSequence} my={2} ml={2}>{label}</Text>
                <Box alignSelf={'flex-end'} my={2} mr={2}>
                    <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" size={21}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            actionElement(item);
                        }}
                        icon={<FontAwesomeIcon icon={icon.name} size={20} style={styles.textSequence} color={icon.color} />}
                    />
                </Box>
            </Flex>
        </Box>)
}