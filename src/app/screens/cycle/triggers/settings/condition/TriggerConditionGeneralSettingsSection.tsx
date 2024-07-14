import React, { useEffect, useState } from "react";
import { Box, ScrollView } from "native-base";
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { InputForm, TextAreaForm } from "../../../../../components/common/FormComponents";
import { BoxFormStyle } from "../../../../../styles/components/common/boxForm";
import { useForm } from "react-hook-form";
import { hapticOptions } from "../../../../../data/cycleTypes";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { updateCondition } from "../../../../../../module/process/infrasctructure/store/actions/condition";
import { connect } from "react-redux";

function TriggerConditionGeneralSettingsSection(props: any) {
    const defaultValues = { ...props.route.params?.conditionData };
    const [saveUnchangedData, setSaveUnchangedData] = useState(defaultValues.isModified);

    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            console.log(saveUnchangedData);
            props.updateCondition({ ...data, isModified: saveUnchangedData })
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
            </Box>
        </ScrollView>
    );
}

export default connect(null, {
    updateCondition
})(TriggerConditionGeneralSettingsSection);