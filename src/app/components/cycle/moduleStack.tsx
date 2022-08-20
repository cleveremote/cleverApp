import React from 'react';
import { Box, Flex, IconButton, Progress, Text } from "native-base";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCog, faForward, faMinus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../styles/cycleStyles';
import { hapticOptions, ModuleItem, SequenceItem } from '../../data/cycleTypes';


export function ModuleStack(item: ModuleItem, deleteModule: Function) {
    return (
        <Box alignSelf="stretch" bg={'white'} rounded="xl" shadow={3} m={1} key={item.key}>
            <Flex direction="row">
                <Text flex={1} alignSelf={'flex-start'} style={styles.textSequence} my={2} ml={2}>port number {item.portNum}</Text>
                <Box alignSelf={'flex-end'} my={2} mr={2}>
                    <IconButton size={21}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            deleteModule(item);
                        }}
                        icon={<FontAwesomeIcon icon={faMinus} size={20} style={styles.textSequence} color={'red'} />}
                    />
                </Box>
            </Flex>
        </Box>)
}