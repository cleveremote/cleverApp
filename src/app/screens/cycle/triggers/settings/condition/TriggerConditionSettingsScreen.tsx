import React, { useEffect, useRef } from "react";
import { NativeBaseProvider, VStack, Box, FormControl } from "native-base";
import { connect } from 'react-redux';
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { DeleteItemMenu, MenuAccordion } from "../../../../../components/common/cycleMenu";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { faBolt, faGear } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { loadCondition, saveCondition } from "../../../../../../module/process/infrasctructure/store/actions/condition";



function TriggerConditionSettingsScreen(props: any) {
    const isModified = useRef(!props.route.params.condition?.id);

    const checkChanges = (e: any) => {
        if (!isModified.current) {
            return;
        }
        console.log(props.condition);
        saveCondition(props.condition, true, true);
    }

    const _deleteItem = () => {
        const data = { ...props.condition, id: `deleted_${props.condition.id}` };
        saveCondition(data, false, true);
    }

    const saveCondition = (condition: any, haptic: boolean, goBack: boolean) => {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        isModified.current = false;
        props.saveCondition(condition);
        if (goBack) {
            props.navigation.goBack();
        }
    }

    useEffect(() => {
        console.log("props.route.params.condition?.triggerId || props.route.params.trigger.id",props.route.params.condition?.triggerId || props.route.params.trigger.id)
        props.loadCondition(props.route.params.condition?.id, props.route.params.condition?.triggerId || props.route.params.trigger.id)
    }, []);

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        const listenerUnsubscribe = props.navigation.addListener('beforeRemove', (e: any) => { checkChanges(e) });
        isModified.current = props.condition?.isModified;
        return () => listenerUnsubscribe();
    }, [props.condition]);

    return (
        <NativeBaseProvider>
            <VStack alignSelf="stretch" shadow={3}>
                <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                    <Box>
                        <FormControl>
                            <MenuAccordion key={21} name={'General'} icon={faGear}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('TriggerConditionGeneralSettingsSection', {
                                        conditionData: props.condition
                                    })
                                }} />
                            <MenuAccordion key={41} name={'Execution'} icon={faBolt}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('TriggerConditionParamSettingsSection', {
                                        conditionData: props.condition
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
    condition: state.trigger_condition.condition
});

export default connect(mapStateToProps, {
    saveCondition,
    loadCondition
})(TriggerConditionSettingsScreen);