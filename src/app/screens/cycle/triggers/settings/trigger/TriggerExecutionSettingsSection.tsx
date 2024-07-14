import { useEffect, useState } from "react";
import { HStack, Switch, Text, ScrollView, Box } from "native-base";
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { BoxFormStyle } from "../../../../../styles/components/common/boxForm";
import { DateTimePickerForm, SelectForm } from "../../../../../components/common/FormComponents";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { useForm } from "react-hook-form";
import { updateTrigger } from "../../../../../../module/process/infrasctructure/store/actions/trigger";
import { connect } from "react-redux";

function TriggerExecutionSettingsSection(props: any) {
    const defValues = { ...props.route.params?.triggerData };
    const getTimeString = (dateValue: number) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return new Date(date.getTime() + dateValue);
    }
    const defaultValues = { action: defValues.action, delay: getTimeString(defValues.delay), timeAfter: getTimeString(defValues.trigger?.timeAfter), sunState: defValues.trigger?.sunBehavior?.sunState, time: getTimeString(defValues.trigger?.sunBehavior?.time) };
    const [sunState, setSunState] = useState(!!defValues.trigger?.sunBehavior?.sunState);
    const [saveUnchangedData, setSaveUnchangedData] = useState(false);

    const { control, handleSubmit, formState: { errors }, setValue } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            props.updateTrigger({ ...mappingtoDto(data), isModified: saveUnchangedData })
        }
        props.navigation.goBack()
    }

    const mappingtoDto = (data: any) => {
        const result = { ...defValues };
        result.delay = convertToMs(data.delay);
        result.action = data.action;
        console.log("mappingtoDto",sunState)
        if (sunState) {
            result.trigger = { ...result.trigger, sunBehavior: { sunState: data.sunState, time: convertToMs(data.time) }, timeAfter: undefined };
        } else {
            result.trigger = { ...result.trigger, timeAfter: convertToMs(data.timeAfter), sunBehavior: undefined };
        }
        
        return result;
    }

    const convertToMs = (t: Date) => {
        const time = t.toLocaleTimeString();
        let ms = Number(time.split(':')[0]) * 60 * 60 * 1000 + Number(time.split(':')[1]) * 60 * 1000;
        return ms;
    }

    useEffect(() => {
        console.log("defaultValues 123456", props.route.params?.triggerData);
        props.navigation.setOptions({ headerLeft: () => navigationHeader(handleSubmit(onSubmit), 'arrow-alt-circle-left', false) });
    }, [saveUnchangedData])

    return (

        <ScrollView automaticallyAdjustKeyboardInsets={true}>
            <Box rounded="xl" style={BoxFormStyle.boxForm}>
                <SelectForm lstData={[{ label: 'ON', value: 'ON'},{ label: 'OFF', value: 'OFF' }]} control={control} errors={errors} name="action" placeholder="Sun state*" rules={{ required: true }} onValueChange={(value) => { setSaveUnchangedData(true) }} />
                <DateTimePickerForm mode={"time"} control={control} errors={errors} name="delay" placeholder="Disable trigger for moment" rules={{ required: true }} onChangeText={() => { setSaveUnchangedData(true) }} />

                <HStack marginLeft="5" marginTop={2} mb={2}>
                    <Switch isChecked={sunState} onTrackColor={'#32404e'} offThumbColor={'blueGray.50'} size={'md'}
                        onValueChange={(checked) => {
                            setSunState(checked);
                            if (checked) {
                                setValue('timeAfter', new Date(), { shouldValidate: true });
                            } else {
                                setValue('sunState', null, { shouldValidate: true });
                                setValue('time', new Date(), { shouldValidate: true });
                            }

                        }}
                    />
                    <Text style={{ marginTop: 5, color: '#32404e', fontSize: 15, marginLeft: 5, fontWeight: 'bold' }}>Trigger based on (sun-state/delay) </Text>
                </HStack>
                {sunState ? (
                    <>
                        <SelectForm lstData={[{ label: 'SUNSET', value: 'SUNSET'},{ label: 'SUNRISE', value: 'SUNRISE' }]} control={control} errors={errors} name="sunState" placeholder="Sun state*" rules={{ required: true }} onValueChange={(value) => { setSaveUnchangedData(true) }} />
                        <DateTimePickerForm mode={"time"} control={control} errors={errors} name="time" placeholder="After sunset / Before sunrise*" rules={{ required: true }} onChangeText={() => { setSaveUnchangedData(true) }} />
                    </>
                ) : (
                    <DateTimePickerForm mode={"time"} control={control} errors={errors} name="timeAfter" placeholder="Trigger after*" rules={{ required: true }} onChangeText={() => { setSaveUnchangedData(true) }} />
                )}
            </Box>
        </ScrollView>
    );
}

export default connect(null, {
    updateTrigger
})(TriggerExecutionSettingsSection);