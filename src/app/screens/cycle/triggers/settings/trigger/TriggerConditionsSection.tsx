import { useEffect } from "react";
import { NativeBaseProvider, VStack, Box, IconButton, Text } from "native-base";
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { connect } from "react-redux";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { elementStack } from "../../../../../components/cycle/moduleStack";
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { loadConditions } from "../../../../../../module/process/infrasctructure/store/actions/condition";
import { updateTrigger } from "../../../../../../module/process/infrasctructure/store/actions/trigger";

function TriggerConditionsSection(props: any) {
    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => props.navigation.goBack(), 'arrow-alt-circle-left', false)
        });
        props.loadConditions(props.route.params.triggerData);
    }, []);

    useEffect(() => {
        console.log('ismodified',props.conditions);
        props.updateTrigger({ ...props.route.params.triggerData, conditions: props.conditions, isModified: !!props.conditions.find((x: any) => x.isModified) });
    }, [props.conditions]);

    return (
        <NativeBaseProvider>
            <VStack space={2} my={1} alignSelf="stretch" shadow={3} margin={5}>
                <Box key={111} alignSelf="stretch" bg='white' rounded="xl" padding={2}>
                    {props.conditions.map((element: any) => element.id && element.id.indexOf('deleted_') > -1 ? null : elementStack(element, (item: any) => {
                        props.navigation.navigate('ConditionSettingsStack', { screen: 'TriggerConditionSettingsScreen', params: { trigger: props.route.params.triggerData, condition: item } });
                    }, `condition ${element.description}`, { name: faCog, color: '#32404e' }))}
                    <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton _pressed={{ _icon: { size: 35 } }} variant="unstyled" marginTop={5} style={{ transform: [{ rotate: '135deg' }] }} size={30} icon={<Icon name={'times-circle'} size={30} color='#32404e' />}
                            onPress={async () => {
                                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                props.navigation.navigate('ConditionSettingsStack', { screen: 'TriggerConditionSettingsScreen', params: { trigger: props.route.params.triggerData } });
                            }} />
                        <Text style={{ color: '#32404e', fontSize: 15 }}>
                            Add new condition ...
                        </Text>
                    </VStack>
                </Box>
            </VStack>
        </NativeBaseProvider>
    );
}

const mapStateToProps = (state: any) => ({
    conditions: state.trigger_condition.conditions,
});

export default connect(mapStateToProps, {
    loadConditions,
    updateTrigger
})(TriggerConditionsSection);