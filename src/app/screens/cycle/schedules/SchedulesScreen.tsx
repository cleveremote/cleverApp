import React, { useEffect } from "react";
import { NativeBaseProvider, VStack, Box, IconButton, Text } from "native-base";
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { connect } from "react-redux";
import { navigationHeader } from "../../../components/common/navigationHeaders";
import { elementStack } from "../../../components/cycle/moduleStack";
import { hapticOptions } from "../../../data/cycleTypes";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { loadSchedules } from "../../../../module/process/infrasctructure/store/actions/schedule";
import { saveCycle, updateCycle } from "../../../../module/process/infrasctructure/store/actions/cycle";

export function SchedulesScreen(props: any) {

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => props.navigation.goBack(), 'arrow-alt-circle-left', false)
        });
        props.loadSchedules(props.route.params.cycle);
    }, []);

    useEffect(() => {
        props.saveCycle({ ...props.route.params.cycle, schedules: props.schedules }, true);
        console.log("props.schedules", props.schedules)
    }, [props.schedules]);



    return (
        <NativeBaseProvider>
            <VStack space={2} my={1} alignSelf="stretch" shadow={3} margin={5}>
                <Box key={111} alignSelf="stretch" bg='white' rounded="xl" padding={2}>
                    {props.schedules.map((element: any) => element.id && element.id.indexOf('deleted_') > -1 ? null : elementStack(element, (item: any) => {
                        props.navigation.navigate('ScheduleSettingsStack', { screen: 'ScheduleSettingsMenu', params: { schedule: item } });
                    }, `schedule ${element.description}`, { name: faCog, color: '#32404e' }))}
                    <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" marginTop={5} style={{ transform: [{ rotate: '135deg' }] }} size={30} icon={<Icon name={'times-circle'} size={30} color='#32404e' />}
                            onPress={async () => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                props.navigation.navigate('ScheduleSettingsStack', { screen: 'ScheduleSettingsMenu', params: { cycle: props.route.params.cycle } });
                            }} />
                        <Text style={{ color: '#32404e', fontSize: 15 }}>
                            Add new schedule ...
                        </Text>
                    </VStack>
                </Box>
            </VStack>
        </NativeBaseProvider>
    );

}

const mapStateToProps = (state: any) => ({
    schedules: state.cycle_schedule.schedules,
});

export default connect(mapStateToProps, {
    loadSchedules,
    saveCycle
})(SchedulesScreen);