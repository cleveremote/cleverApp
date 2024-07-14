import React, { useEffect, useRef } from "react";
import { NativeBaseProvider, VStack, Box } from "native-base";
import { connect } from 'react-redux';
import { navigationHeader } from "../../../../components/common/navigationHeaders";
import { DeleteItemMenu, MenuAccordion } from "../../../../components/common/cycleMenu";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { faGear, faRotateRight, faTrafficLight } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../../../../data/cycleTypes";
import { Alert } from "react-native";
import { loadCycle, saveCycle } from "../../../../../module/process/infrasctructure/store/actions/cycle";



export function CycleSett(props: any) {

    const isModified = useRef(!props.route.params?.cycle?.id);

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
                { text: "save", style: 'cancel', onPress: () => { saveCycle(props.cycle, true, true); } },
                { text: 'Discard', style: 'destructive', onPress: () => props.navigation.dispatch(e.data.action) },
            ]
        );
    }

    const _deleteItem = () => {
        const data = { ...props.cycle, id: `deleted_${props.cycle.id}` };
        saveCycle(data, true, true);
        
    }


    const saveCycle = (cycle: any, haptic: boolean, goBack: boolean) => {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        isModified.current = false;
        console.log('test go back1');
        props.saveCycle(cycle);
        console.log('test go back2',goBack);
        if (goBack) {
            console.log('test go back3');
            props.navigation.goBack();
        }
    }

    useEffect(() => {
        props.loadCycle(props.route.params?.id);
    }, []);

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        const listenerUnsubscribe = props.navigation.addListener('beforeRemove', (e: any) => { checkChanges(e) });
        isModified.current = props.cycle?.isModified;
        return () => listenerUnsubscribe();
    }, [props.cycle]);



    return (
        <NativeBaseProvider>
            <VStack alignSelf="stretch" shadow={3}>
                <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                    <MenuAccordion key={21} name={'General'} icon={faGear}
                        onPress={() => {
                            console.log("props.cycle", props.cycle)
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.navigation.navigate('CycleGeneralSection', { cycleData: props.cycle })
                        }} />
                    <MenuAccordion key={41} name={'Priority'} icon={faTrafficLight}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.navigation.navigate('CyclePrioritySection', { cycleData: props.cycle })
                        }} />
                    <MenuAccordion key={51} name={'Sequences'} icon={faRotateRight}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.navigation.navigate('CycleSequenceSection', { cycleData: props.cycle })
                        }} />
                    <DeleteItemMenu key={61} OnConfirm={() => { _deleteItem(); }} />
                </Box>
            </VStack>
        </NativeBaseProvider>
    );
}

const mapStateToProps = (state: any) => ({
    cycle: state.root_cycle.cycle,
});

export default connect(mapStateToProps, {
    loadCycle,
    saveCycle
})(CycleSett);