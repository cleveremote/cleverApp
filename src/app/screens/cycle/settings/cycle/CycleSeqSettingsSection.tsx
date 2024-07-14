import React, { useEffect } from "react";
import { IconButton, Box, VStack, Text } from "native-base";
import { navigationHeader } from "../../../../components/common/navigationHeaders";
import { hapticOptions } from "../../../../data/cycleTypes";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { connect } from "react-redux";
import { useForm } from "react-hook-form";
import { DragableForm } from "../../../../components/common/FormComponents";
import { updateCycle } from "../../../../../module/process/infrasctructure/store/actions/cycle";
import { loadSequences, updateSequencesOder } from "../../../../../module/process/infrasctructure/store/actions/sequence";

export function SeqSettingsSec(props: any) {

    const defaultValues = { ...props.route.params?.cycleData };
    const { control, handleSubmit, formState: { errors }, setValue } = useForm({ defaultValues })

    const updateSeqeuncesOrder = (data: any) => {
        console.log('je rentre');
        props.updateSequencesOder(data.sequences);
    }

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        props.loadSequences(props.route.params.cycleData);
    }, []);


    useEffect(() => {
        setValue('sequences', props.sequences, { shouldValidate: true });
        props.updateCycle({ ...props.route.params.cycleData, sequences: props.sequences, isModified: props.route.params.cycleData.isModified || !!props.sequences.find((x: any) => x.isModified) });
    }, [props.sequences]);


    return (
        <VStack space={2} my={1} alignSelf="stretch" shadow={3} margin={5}>
            <Box key={111} alignSelf="stretch" bg='white' rounded="xl" padding={2}>
                <DragableForm isList={true} navigation={props.navigation} parentId={props.route.params.cycleData.id} control={control} errors={errors} name="sequences" onDragEnd={() => handleSubmit(updateSeqeuncesOrder)()} />
                <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                    <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" marginTop={5} style={{ transform: [{ rotate: '135deg' }] }} size={30} icon={<Icon name={'times-circle'} size={30} color='#32404e' />}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.navigation.navigate('SequenceSettingsStack', { screen: "SequenceSettingsMenu", params: { cycleId: props.route.params.cycleData.id } });
                        }} />
                    <Text style={{ color: '#32404e', fontSize: 15 }}>
                        Add new sequence ...
                    </Text>
                </VStack>
            </Box>
        </VStack>
    );
}

const mapStateToProps = (state: any) => ({
    sequences: state.cycle_sequence.sequences,
    cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
    updateSequencesOder,
    loadSequences,
    updateCycle
})(SeqSettingsSec);

