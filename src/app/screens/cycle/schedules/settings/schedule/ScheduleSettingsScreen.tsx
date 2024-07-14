import React, { useEffect, useRef } from "react";
import { NativeBaseProvider, VStack, Box, FormControl } from "native-base";
import { connect } from 'react-redux';
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { DeleteItemMenu, MenuAccordion } from "../../../../../components/common/cycleMenu";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { faBolt, faGear } from "@fortawesome/free-solid-svg-icons";
import { Alert } from "react-native";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { loadSchedule, saveSchedule } from "../../../../../../module/process/infrasctructure/store/actions/schedule";


export function ScheduleSettingsScreen(props: any) {

    const isModified = useRef(!props.route.params.schedule?.id);

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
                { text: "save", style: 'cancel', onPress: () => { saveSchedule(props.schedule, true, true); } },
                { text: 'Discard', style: 'destructive', onPress: () => props.navigation.dispatch(e.data.action) },
            ]
        );
    }


    const _deleteItem = () => {
        const data = { ...props.schedule, id: `deleted_${props.schedule.id}` };
        saveSchedule(data, false, true);
    }


    const saveSchedule = (schedule: any, haptic: boolean, goBack: boolean) => {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        isModified.current = false;
        props.saveSchedule(schedule);
        if (goBack) {
            props.navigation.goBack();
        }
    }

    useEffect(() => {
        props.loadSchedule(props.route.params.schedule?.id, props.route.params.schedule?.cycleId || props.route.params.cycle.id )
    }, []);

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        const listenerUnsubscribe = props.navigation.addListener('beforeRemove', (e: any) => { checkChanges(e) });
        isModified.current = props.schedule?.isModified;
        console.log("test ", props.schedule);
        return () => listenerUnsubscribe();
    }, [props.schedule]);



    return (
        <NativeBaseProvider>
            <VStack alignSelf="stretch" shadow={3}>
                <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                    <Box>
                        <FormControl>
                            <MenuAccordion key={21} name={'General'} icon={faGear}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('ScheduleGeneralSettingsSection', {
                                        scheduleData: props.schedule
                                    })
                                }} />
                            <MenuAccordion key={41} name={'Execution'} icon={faBolt}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('ScheduleExecutionSettingsSection', {
                                        scheduleData: props.schedule
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
    schedule: state.cycle_schedule.schedule
});

export default connect(mapStateToProps, {
    saveSchedule,
    loadSchedule
})(ScheduleSettingsScreen);
