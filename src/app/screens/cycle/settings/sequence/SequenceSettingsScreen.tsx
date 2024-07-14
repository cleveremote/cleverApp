import React, { useEffect, useRef } from "react";
import { NativeBaseProvider, VStack, Box, FormControl } from "native-base";
import { connect } from 'react-redux';
import { navigationHeader } from "../../../../components/common/navigationHeaders";
import { DeleteItemMenu, MenuAccordion } from "../../../../components/common/cycleMenu";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { faEthernet, faGear, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../../../../data/cycleTypes";
import { loadSequence, saveSequence } from "../../../../../module/process/infrasctructure/store/actions/sequence";



function SequenceSettingsScreen(props: any) {
    const isModified = useRef(!props.route.params.item?.id);

    const checkChanges = (e: any) => {
        if (!isModified.current) {
            return;
        }
        saveSequence(props.sequence, true, true);
    }

    const _deleteItem = () => {
        const data = { ...props.sequence, id: `deleted_${props.sequence.id}` };
        saveSequence(data, false, true);
    }

    const saveSequence = (sequence: any, haptic: boolean, goBack: boolean) => {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        isModified.current = false;
        props.saveSequence(sequence);
        if (goBack) {
            props.navigation.goBack();
        }
    }

    useEffect(() => {
        console.log("props.route.params 123",props.route.params.item?.id)
        props.loadSequence(props.route.params.item?.id)
    }, []);

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        const listenerUnsubscribe = props.navigation.addListener('beforeRemove', (e: any) => { checkChanges(e) });
        isModified.current = props.sequence?.isModified;
        return () => listenerUnsubscribe();
    }, [props.sequence]);


    return (
        <NativeBaseProvider>
            <VStack alignSelf="stretch" shadow={3}>
                <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                    <Box>
                        <FormControl>
                            <MenuAccordion key={21} name={'General'} icon={faGear}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('SequenceGeneralSection', {
                                        sequenceData: props.sequence
                                    })
                                }} />
                            <MenuAccordion key={41} name={'Security'} icon={faShieldHalved}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('SequenceSecuritySection', {
                                        sequenceData: props.sequence
                                    })
                                }} />

                            <MenuAccordion key={51} name={'Modules'} icon={faEthernet}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('SequenceModulesSettingsSection', {
                                        sequenceData: props.sequence
                                    })
                                }} />

                            <DeleteItemMenu key={61} OnConfirm={() => { _deleteItem(); }} />
                        </FormControl>
                    </Box>
                </Box>
            </VStack>
        </NativeBaseProvider>
    );
}

const mapStateToProps = (state: any) => ({
    sequence: state.cycle_sequence.sequence
});

export default connect(mapStateToProps, {
    saveSequence,
    loadSequence
})(SequenceSettingsScreen);
