import React, { useEffect, useRef } from "react";
import { NativeBaseProvider, VStack, Box } from "native-base";
import { connect } from 'react-redux';
import { navigationHeader } from "../../../components/common/navigationHeaders";
import { DeleteItemMenu, MenuAccordion } from "../../../components/common/cycleMenu";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { faTrafficLight } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../../../data/cycleTypes";
import { Alert } from "react-native";
import { loadSensor, saveSensor } from "../../../../module/process/infrasctructure/store/actions/sensor";



function SensorSettingsScreen(props: any) {
    const isModified = useRef(!props.route.params?.sensor?.id);

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
                { text: "save", style: 'cancel', onPress: () => { saveSensor(props.sensor, true, true); } },
                { text: 'Discard', style: 'destructive', onPress: () => props.navigation.dispatch(e.data.action) },
            ]
        );
    }

    const _deleteItem = () => {
        const data = { ...props.sensor, id: `deleted_${props.sensor.id}` };
        saveSensor(data, true, true);
        
    }


    const saveSensor = (sensor: any, haptic: boolean, goBack: boolean) => {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        isModified.current = false;
        props.saveSensor(sensor);
        if (goBack) {
            props.navigation.goBack();
        }
    }

    useEffect(() => {
        props.loadSensor(props.route.params?.id);
    }, []);

    useEffect(() => {
        console.log('props.sensor,',props.sensor)
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        const listenerUnsubscribe = props.navigation.addListener('beforeRemove', (e: any) => { checkChanges(e) });
        isModified.current = props.sensor?.isModified;
        return () => listenerUnsubscribe();
    }, [props.sensor]);

    return (
        <NativeBaseProvider>
            <VStack alignSelf="stretch" shadow={3}>
                <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                    <MenuAccordion key={41} name={'General'} icon={faTrafficLight}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            props.navigation.navigate('SensorGeneralSection', { sensorData: props.sensor })
                        }} />
                    <DeleteItemMenu key={61} OnConfirm={() => { _deleteItem(); }} />
                </Box>
            </VStack>
        </NativeBaseProvider>
    );
}

const mapStateToProps = (state: any) => ({
    sensor: state.root_sensor.sensor
});

export default connect(mapStateToProps, {
    loadSensor,
    saveSensor
})(SensorSettingsScreen);