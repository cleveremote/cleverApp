import React, { useEffect } from "react";
import { Box, HStack, Switch, Text, ScrollView } from "native-base";
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { DateTimePickerForm, InputForm, SelectForm } from "../../../../../components/common/FormComponents";
import { useForm } from "react-hook-form";
import { BoxFormStyle } from "../../../../../styles/components/common/boxForm";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { connect } from "react-redux";
import { updateSchedule } from "../../../../../../module/process/infrasctructure/store/actions/schedule";
import { isValidCron } from 'cron-validator'

export function ScheduleExecutionSettingsSection(props: any) {
    const defValues = { ...props.route.params?.scheduleData };
    const getTimeString = (dateValue: number) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return new Date(date.getTime() + dateValue);
    }
    const defaultValues = { pattern: defValues.cron?.pattern, date: defValues.cron?.date, after: getTimeString(defValues.cron?.after), sunState: defValues.cron?.sunBehavior?.sunState, time: getTimeString(defValues.cron?.sunBehavior?.time) };

    const [sunState, setSunState] = React.useState(!!defValues.cron?.sunBehavior?.sunState);
    const [pattern, setPattern] = React.useState(!!defValues.cron?.pattern);

    const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);

    const { control, handleSubmit, formState: { errors }, setValue, register } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            props.updateSchedule({ ...mappingtoDto(data), isModified: saveUnchangedData })
        }
        props.navigation.goBack()
    }



    const mappingtoDto = (data: any) => {
        const result = { ...defValues };
        if (pattern) {
            result.cron = { pattern: data.pattern, date: null };
        } else {
            result.cron = { ...result.cron, date: data.date.toString(), pattern: null };
        }

        if (sunState) {
            console.log('time', data.time, parseInt(data.time));
            result.cron = { ...result.cron, sunBehavior: { sunState: data.sunState, time: convertToMs(data.after) }, after: undefined };
        } else {
            result.cron = { ...result.cron, after: convertToMs(data.after), sunBehavior: undefined };
        }
        return result;
    }

    const convertToMs = (t: Date) => {
        const time = t.toLocaleTimeString();
        console.log('ms1', time);
        let ms = Number(time.split(':')[0]) * 60 * 60 * 1000 + Number(time.split(':')[1]) * 60 * 1000;
        console.log('ms2', ms);
        return ms;
    }

    const validateCronExpression = (pattern: string) => {
        return isValidCron(pattern, { seconds: true });
    }

    useEffect(() => {
        props.navigation.setOptions({ headerLeft: () => navigationHeader(handleSubmit(onSubmit), 'arrow-alt-circle-left', false) });
    }, [saveUnchangedData])
    return (

        <ScrollView automaticallyAdjustKeyboardInsets={true}>
            <Box rounded="xl" style={BoxFormStyle.boxForm}>
                <HStack marginLeft="5" marginTop={2} mb={2}>
                    <Switch isChecked={pattern} onTrackColor={'#32404e'} offThumbColor={'blueGray.50'} size={'md'}
                        onValueChange={(checked) => {
                            setPattern(checked);
                            if (checked) {
                                setValue('date', new Date(), { shouldValidate: true });
                            } else {
                                setValue('pattern', null, { shouldValidate: true });
                            }
                        }}
                    />
                    <Text style={{ marginTop: 5, color: '#32404e', fontSize: 15, marginLeft: 5, fontWeight: 'bold' }}>Schedule by Date/Pattern</Text>
                </HStack>
                {pattern ? (
                    <InputForm control={control} errors={errors} name="pattern" placeholder="Pattern*" rules={{ required: true }} refr={register('pattern', {
                        validate: validateCronExpression
                    })}
                        onChangeText={(value) => { setSaveUnchangedData(true) }} />
                ) : (
                    <DateTimePickerForm mode={"datetime"} control={control} errors={errors} name="date" placeholder="Date*" rules={{ required: true }} onChangeText={(value) => { setSaveUnchangedData(true) }} />
                )}

                <HStack marginLeft="5" marginTop={2} mb={2}>
                    <Switch isChecked={sunState} onTrackColor={'#32404e'} offThumbColor={'blueGray.50'} size={'md'}
                        onValueChange={(checked) => {
                            setSunState(checked);
                            if (checked) {
                                setValue('after', new Date(), { shouldValidate: true });
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
                        <SelectForm lstData={[{ label: 'SUNSET', value: 'SUNSET' }, { label: 'SUNRISE', value: 'SUNRISE' }]} control={control} errors={errors} name="sunState" placeholder="Sun state*" rules={{ required: true }} onValueChange={(value) => { setSaveUnchangedData(true) }} />
                        <DateTimePickerForm mode={"time"} control={control} errors={errors} name="time" placeholder="After sunset / Before sunrise*" rules={{ required: true }} onChangeText={() => { setSaveUnchangedData(true) }} />
                    </>
                ) : (
                    <DateTimePickerForm mode={"time"} control={control} errors={errors} name="after" placeholder="Trigger after*" rules={{ required: true }} onChangeText={() => { setSaveUnchangedData(true) }} />
                )}
            </Box>
        </ScrollView>
    );
}

export default connect(null, {
    updateSchedule
})(ScheduleExecutionSettingsSection);