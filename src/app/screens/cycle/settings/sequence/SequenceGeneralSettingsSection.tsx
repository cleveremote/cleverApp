import React, { useEffect } from "react";
import { Box, ScrollView } from "native-base";
import { navigationHeader } from "../../../../components/common/navigationHeaders";
import { BoxFormStyle } from "../../../../styles/components/common/boxForm";
import { InputForm, TextAreaForm } from "../../../../components/common/FormComponents";
import { connect } from "react-redux";
import { useForm } from "react-hook-form";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../../../data/cycleTypes";
import { updateSequence } from "../../../../../module/process/infrasctructure/store/actions/sequence";

export function SequenceGeneralSettingsSection(props: any) {
    const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
    const defaultValues = { ...props.route.params?.sequenceData };
    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            props.updateSequence({ ...data, isModified: saveUnchangedData })
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
    updateSequence
})(SequenceGeneralSettingsSection);
