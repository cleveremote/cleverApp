import { useEffect, useRef } from "react";
import { NativeBaseProvider, VStack, Box, FormControl } from "native-base";
import { connect } from 'react-redux';
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { DeleteItemMenu, MenuAccordion } from "../../../../../components/common/cycleMenu";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { faBolt, faCheckDouble, faGear } from "@fortawesome/free-solid-svg-icons";
import { Alert } from "react-native";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { loadTrigger, saveTrigger } from "../../../../../../module/process/infrasctructure/store/actions/trigger";



export function TriggerSettingsScreen(props: any) {

    const isModified = useRef(!props.route.params.trigger?.id);

    const checkChanges = (e: any) => {
        if (!isModified.current) {
            return;
        }
        const action = true; ////e.data.action.type !== 'POP_TO_TOP';
        e.preventDefault();
        Alert.alert(
            'Discard changes?',
            'You have unsaved changes. Are you sure to discard them and leave the screen?',
            [
                { text: "save", style: 'cancel', onPress: () => { saveTrigger(props.trigger, true, true); } },
                { text: 'Discard', style: 'destructive', onPress: () => props.navigation.dispatch(e.data.action) },
            ]
        );
    }


    const _deleteItem = () => {
        const data = { ...props.trigger, id: `deleted_${props.trigger.id}` };
        saveTrigger(data, false, true);
    }


    const saveTrigger = (trigger: any, haptic: boolean, goBack: boolean) => {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        isModified.current = false;
        props.saveTrigger(trigger);
        if (goBack) {
            props.navigation.goBack();
        }
    }

    useEffect(() => {
        props.loadTrigger(props.route.params.trigger?.id, props.route.params.trigger?.cycleId || props.route.params.cycle.id)
    }, []);

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        const listenerUnsubscribe = props.navigation.addListener('beforeRemove', (e: any) => { checkChanges(e) });
        isModified.current = props.trigger?.isModified;
        return () => listenerUnsubscribe();
    }, [props.trigger]);

    return (
        <NativeBaseProvider>
            <VStack alignSelf="stretch" shadow={3}>
                <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                    <Box>
                        <FormControl>
                            <MenuAccordion key={21} name={'General'} icon={faGear}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('TriggerGeneralSettingsSection', {
                                        triggerData: props.trigger
                                    })
                                }} />
                            <MenuAccordion key={41} name={'Execution'} icon={faBolt}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('TriggerExecutionSettingsSection', {
                                        triggerData: props.trigger
                                    })
                                }} />

                            <MenuAccordion key={51} name={'Conditions'} icon={faCheckDouble}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('TriggerConditionsSection', {
                                        triggerData: props.trigger
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
    trigger: state.cycle_trigger.trigger
});

export default connect(mapStateToProps, {
    saveTrigger,
    loadTrigger
})(TriggerSettingsScreen);