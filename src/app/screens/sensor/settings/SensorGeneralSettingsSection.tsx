import React, { useEffect } from "react";
import { Box, ScrollView } from "native-base";
import { navigationHeader } from "../../../components/common/navigationHeaders";
import { useForm } from "react-hook-form"
import { BoxFormStyle } from "../../../styles/components/common/boxForm";
import { InputForm, SelectColor } from "../../../components/common/FormComponents";
import { connect } from "react-redux";
import { updateSensor } from "../../../../module/process/infrasctructure/store/actions/sensor";

export function SensorGeneralSettingsSection(props: any) {
    const [sensorData, setSensorData] = React.useState(props.route.params?.sensorData);
    const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
    const defaultValues = { ...props.route.params?.sensorData };
    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        let style = data.style;
        if (typeof style === 'string') {
            style = JSON.parse(style)
        }
        props.updateSensor({ ...data, style: { fontColor: style.fontColor, iconColor: style.iconColor, bgColor: style.bgColor }, isModified: saveUnchangedData })
        props.navigation.goBack()
    }

    useEffect(() => {
        props.navigation.setOptions({ headerLeft: () => navigationHeader(handleSubmit(onSubmit), 'arrow-alt-circle-left', false) });
    }, [saveUnchangedData])


    return (
        <Box rounded="xl" style={BoxFormStyle.boxForm}>
            <SelectColor control={control} errors={errors} name="style" placeholder="Sensor theme*" rules={{ required: true }} style={{ fontColor: sensorData?.style?.fontColor }}
                onChangeText={(value) => { setSensorData({ ...sensorData, style: JSON.parse(value) }); setSaveUnchangedData(true) }} />
            <ScrollView automaticallyAdjustKeyboardInsets={true}>
                <InputForm control={control} errors={errors} name="name" placeholder="Name*" rules={{ required: true }} onChangeText={(value) => { setSaveUnchangedData(true) }} />
                <InputForm control={control} errors={errors} name="unit" placeholder="Unit" disabled={true} />
                <InputForm control={control} errors={errors} name="type" placeholder="Type" disabled={true} />
                <InputForm control={control} errors={errors} name="description" placeholder="Description" onChangeText={(value) => { setSaveUnchangedData(true) }} />
            </ScrollView>
        </Box>
    );
}

export default connect(null, {
    updateSensor
})(SensorGeneralSettingsSection);