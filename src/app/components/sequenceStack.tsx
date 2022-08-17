import * as React from 'react';
import { Box, Flex, IconButton, Progress, Text } from "native-base";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCog, faForward } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../styles/cycleStyles';
import { hapticOptions, SequenceItem } from '../data/cycleTypes';


export function SequenceStack({ navigation, isActive, item,cycleId }: { navigation: any; isActive: boolean; item: SequenceItem,cycleId:string }) {

    return (
        <Box alignSelf="stretch" bg={isActive ? '#60a5fa' : 'white'} rounded="xl" shadow={3} m={1}>
            <Flex direction="row">
                <Text flex={1} alignSelf={'flex-start'} style={isActive ? styles.textSequenceDrag : styles.textSequence} my={2} ml={2}>{item.name}</Text>
                <Box flex={2} alignSelf={'flex-start'} my={2}>
                    <IconButton size={21}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        }}
                        icon={<FontAwesomeIcon icon={faForward} size={20} style={isActive ? styles.textSequenceDrag : styles.textSequence} />}
                    />

                </Box>
                <Box alignSelf={'flex-end'} my={2} mr={2}>


                    <IconButton size={21}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            navigation.navigate('SequenceSettings', { cycleId: cycleId, item });
                        }}
                        icon={<FontAwesomeIcon icon={faCog} size={20} style={isActive ? styles.textSequenceDrag : styles.textSequence} />}
                    />


                </Box>
            </Flex>
            <Flex direction="row" >
                <Box flex={2} alignSelf={'flex-start'} >
                    <Progress size="xs" mx={1.5} value={25} rounded="xl" _filledTrack={{ bg: '#60a5fd' }} />
                    <Text alignSelf={'flex-end'} color={'grey'} fontSize={12} mr={2}>expected finish in 01:01:01</Text>
                </Box>
            </Flex>
        </Box>)
}