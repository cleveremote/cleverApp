import React, { useEffect } from "react";
import { Box, VStack } from "native-base";
import { navigationHeader } from "../../../../components/common/navigationHeaders";
import { DragableForm } from "../../../../components/common/FormComponents";
import { useForm } from "react-hook-form";
import { connect } from "react-redux";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../../../data/cycleTypes";
import { updateCycle } from "../../../../../module/process/infrasctructure/store/actions/cycle";

export function PrioritySettingsSection(props: any) {
    const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
    const defaultValues = { ...props.route.params?.cycleData };
    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            const priorities = data.modePriority.map((x: any, index: number) => ({ mode: x.mode, priority: index }))
            props.updateCycle({ ...data, modePriority: priorities, isModified: saveUnchangedData })
        }
        props.navigation.goBack()
    }

    useEffect(() => {
        props.navigation.setOptions({ headerLeft: () => navigationHeader(handleSubmit(onSubmit), 'arrow-alt-circle-left', false) });
    }, [saveUnchangedData])

    return <VStack space={2} my={1} alignSelf="stretch" shadow={3} margin={5}>
        <Box alignSelf="stretch" bg='white' rounded="xl" padding={2}>
            <DragableForm control={control} errors={errors} name="modePriority" rules={{ required: true }} onDragEnd={(value) => { setSaveUnchangedData(true) }} />
        </Box>
    </VStack>
}

export default connect(null, {
    updateCycle
})(PrioritySettingsSection);