import { useEffect, useState } from "react";
import { Box, ScrollView } from "native-base";
import { navigationHeader } from "../../../../../components/common/navigationHeaders";
import { connect } from "react-redux";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { hapticOptions } from "../../../../../data/cycleTypes";
import { useForm } from "react-hook-form";
import { updateCondition } from "../../../../../../module/process/infrasctructure/store/actions/condition";
import { InputForm, SelectForm } from "../../../../../components/common/FormComponents";
import { BoxFormStyle } from "../../../../../styles/components/common/boxForm";

export function TriggerConditionParamSettingsSection(props: any) {
    const defaultValues = { ...props.route.params?.conditionData };
    const [saveUnchangedData, setSaveUnchangedData] = useState(defaultValues.isModified);

    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            props.updateCondition({ ...data, isModified: saveUnchangedData })
        }
        props.navigation.goBack()
    }

    useEffect(() => {
        props.navigation.setOptions({ headerLeft: () => navigationHeader(handleSubmit(onSubmit), 'arrow-alt-circle-left', false) });
    }, [saveUnchangedData])

    const getDevices = () => {
        const cycles = props.cycles.map((x: any) => ({ label: x.name, value: x.id }));
        const sensors = props.sensors.map((x: any) => ({ label: x.name, value: x.id }));
        const newArray = cycles.concat(sensors);
        return newArray;
    }

    return (
        <ScrollView automaticallyAdjustKeyboardInsets={true}>
            <Box rounded="xl" style={BoxFormStyle.boxForm}>
                <SelectForm lstData={getDevices()} control={control} errors={errors} name="deviceId" placeholder="Sun state*" rules={{ required: true }} onValueChange={(value) => { setSaveUnchangedData(true) }} />
                <SelectForm lstData={[{label:'<',value:'<'},{label:'>',value:'>'},{label:'=',value:'='},{label:'<=',value:'<='},{label:'>=',value:'>='}]} control={control} errors={errors} name="operator" placeholder="Operator*" rules={{ required: true }} onValueChange={(value) => { setSaveUnchangedData(true) }} />
                <InputForm control={control} errors={errors} name="value" placeholder="Value*" rules={{ required: true }} onChangeText={(value) => { setSaveUnchangedData(true) }} />
            </Box>
        </ScrollView>
    );

}

const mapStateToProps = (state: any) => ({
    sensors: state.root_sensor.sensors,
    cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, { updateCondition })(TriggerConditionParamSettingsSection);