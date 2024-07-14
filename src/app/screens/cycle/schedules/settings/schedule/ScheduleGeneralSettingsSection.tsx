import { useEffect, useState } from "react";
import { Box, HStack, ScrollView } from "native-base";
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { InputForm, SwitchForm, TextAreaForm } from "../../../../../components/common/FormComponents";
import { BoxFormStyle } from "../../../../../styles/components/common/boxForm";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { useForm } from "react-hook-form";
import { connect } from "react-redux";
import { updateSchedule } from "../../../../../../module/process/infrasctructure/store/actions/schedule";

export function ScheduleGeneralSettingsSection(props: any) {
    const defaultValues = { ...props.route.params?.scheduleData };
    const [saveUnchangedData, setSaveUnchangedData] = useState(defaultValues.isModified);
    
    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            props.updateSchedule({ ...data, isModified: saveUnchangedData })
        }
        props.navigation.goBack()
    }

    useEffect(() => {
        props.navigation.setOptions({ headerLeft: () => navigationHeader(handleSubmit(onSubmit), 'arrow-alt-circle-left', false) });
    }, [saveUnchangedData])
    return (
        <ScrollView automaticallyAdjustKeyboardInsets={true}>
            <Box rounded="xl" style={BoxFormStyle.boxForm}>
                <InputForm control={control} errors={errors} name="name" placeholder="Name*" rules={{ required: true }} onChangeText={(value) => { setSaveUnchangedData(true) }} />
                <TextAreaForm control={control} errors={errors} name="description" placeholder="Description" onChangeText={(value) => { setSaveUnchangedData(true) }} />
                <HStack space={3}>
                    <SwitchForm control={control} errors={errors} name="isPaused" placeholder="Set paused" rules={{ required: false }} onChangeText={(value) => { setSaveUnchangedData(true) }} />
                    <SwitchForm control={control} errors={errors} name="shouldConfirmation" placeholder="Need confirmation" rules={{ required: false }} onChangeText={(value) => { setSaveUnchangedData(true) }} />
                </HStack>
            </Box>
        </ScrollView>
    );
}

export default connect(null, {
    updateSchedule
})(ScheduleGeneralSettingsSection);