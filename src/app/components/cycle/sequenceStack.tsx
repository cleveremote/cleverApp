import * as React from 'react';
import { Box, Flex, IconButton, Progress, Text } from "native-base";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCog, faForward } from '@fortawesome/free-solid-svg-icons';
import { styles } from '../../styles/cycleStyles';
import { hapticOptions, SequenceItem } from '../../data/cycleTypes';


export function SequenceStack({ navigation, isActive, item, cycleId, onSkip, stackParent }: { navigation: any; isActive: boolean; item: any, cycleId: string, stackParent?: boolean, onSkip: (sequenceId: string) => void }) {

    const [progression, setProgression] = React.useState(0);
    const [miliseconds, setMiliseconds] = React.useState(item.progression?.duration);
    const timerRef = React.useRef(item.status === 'STOPPED' && progression >= 0);

    React.useEffect(() => {
        function getTimerParams(now: Date, startDate: Date, timerDuration: number) {
            const date1utc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
            const date2utc = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
            //day = 1000 * 60 * 60 * 24;
            const diff = (date1utc - date2utc)
            const startIndex = (diff * 100) / (timerDuration);
            const step = ((100 - startIndex) / (item.progression.duration / 1000));
            return { startIndex, step }
        }
        if (item?.progression?.startedAt) {
            setMiliseconds(item.progression?.duration);
            const timerParams = getTimerParams(new Date(), new Date(item.progression.startedAt), item.progression.duration);
            setProgression(timerParams.startIndex > 100 ? 100 : timerParams.startIndex);
            const timerId = setInterval(() => {
                timerRef.current = item.status === 'STOPPED' && progression >= 0;
                const nextStep = progression + (timerParams.step) < 100 ? progression + (timerParams.step) : 100;
                if (timerRef.current) {
                    setProgression(progression => progression + (timerParams.step) < 100 ? progression + (timerParams.step) : 100);
                    setMiliseconds(ms => ms - 1000);
                    clearInterval(timerId);
                } else {
                    setProgression(progression => progression + (timerParams.step) < 100 ? progression + (timerParams.step) : 100);
                    setMiliseconds(ms => ms - 1000);
                }
            }, 1000);

            return () => {
                setProgression(progression => progression + (timerParams.step) < 100 ? progression + (timerParams.step) : 100);
                setMiliseconds(ms => ms - 1000);
                clearInterval(timerId);
                setTimeout(() => {
                    setProgression(0);
                    setMiliseconds(0);
                }, 1000);

            };
        }
    }, [item.status]);

    return (
        <Box alignSelf="stretch" bg={isActive ? '#60a5fa' : 'white'} rounded="xl" shadow={3} m={1}>
            <Flex direction="row">
                <Text flex={1} alignSelf={'flex-start'} style={isActive ? styles.textSequenceDrag : styles.textSequence} my={2} ml={2}>{item.name}</Text>
                {stackParent ? <Box flex={3} alignSelf={'stretch'} mt={4} mr={2}>
                    <Progress size="xs" value={progression} rounded="xl" _filledTrack={{ bg: '#60a5fd' }} />
                    <Text alignSelf={'center'} style={isActive ? styles.textSequenceDrag : styles.textSequence} >{miliseconds > 0 ? 'expected end in ' + getEndTime(miliseconds) : 'duration ' + getEndTime(item.overridedDuradion || item.maxDuration)}</Text>
                </Box> : null}
                {
                    stackParent && miliseconds > 0 ? <Box alignSelf={'flex-end'} my={2} mr={2} >
                        {<IconButton size={25}
                            onLongPress={() => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                onSkip(item.id);
                            }}
                            icon={<FontAwesomeIcon icon={faForward} size={24} style={isActive ? styles.textSequenceDrag : styles.textSequence} />}
                        />}

                    </Box> : null
                }

                {!stackParent ? <Box alignSelf={'flex-end'} my={2} mr={2}>


                    <IconButton size={21}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            navigation.navigate('SequenceSettings', { cycleId: cycleId, item });
                        }}
                        icon={<FontAwesomeIcon icon={faCog} size={20} style={isActive ? styles.textSequenceDrag : styles.textSequence} />}
                    />


                </Box> : null}

            </Flex>

        </Box>)
}

function getEndTime(duration: number) {
    if (duration) {
        let seconds = duration / 1000;
        // 2- Extract hours:
        const hours = parseInt(seconds / 3600); // 3,600 seconds in 1 hour
        seconds = seconds % 3600; // seconds remaining after extracting hours
        // 3- Extract minutes:
        const minutes = parseInt(seconds / 60); // 60 seconds in 1 minute
        // 4- Keep only seconds not extracted to minutes:
        seconds = seconds % 60;
        return ((hours < 10 ? ('0' + hours) : hours) + ":" + (minutes < 10 ? ('0' + minutes) : minutes) + ":" + (seconds < 10 ? ('0' + seconds) : seconds));
    }
    return '...';

}