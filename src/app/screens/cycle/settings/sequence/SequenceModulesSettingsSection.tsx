import React, { useEffect } from "react";
import { VStack, Box, IconButton, Text, HStack } from "native-base";
import { navigationHeader } from "../../../../components/common/navigationHeaders";
import { elementStack } from "../../../../components/cycle/moduleStack";
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { getPorts, hapticOptions } from "../../../../data/cycleTypes";
import { connect } from "react-redux";
import { faMinus } from "@fortawesome/free-solid-svg-icons";
import { BoxFormStyle } from "../../../../styles/components/common/boxForm";
import { loadModules, updateModule } from "../../../../../module/process/infrasctructure/store/actions/module";
import { useForm } from "react-hook-form";
import { SelectForm } from "../../../../components/common/FormComponents";
import { updateSequence } from "../../../../../module/process/infrasctructure/store/actions/sequence";

export function SequenceModulesSettingsSection(props: any) {
    const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
    const defaultValues = { ...props.route.params?.sequenceData };
    const { control, handleSubmit, formState: { errors } } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        props.updateModule({ portNum: data.modules, isModified: true });
        setSaveUnchangedData(true);
    }


    const deleteModule = (item: any) => {
        props.updateModule({ portNum: 'deleted_' + item.id, isModified: true })
    }

    useEffect(() => {
        props.loadModules(props.route.params?.sequenceData);
    }, [])

    useEffect(() => {
        props.navigation.setOptions({ headerLeft: () => navigationHeader(() => _saveSequence(), 'arrow-alt-circle-left', false) });
        setSaveUnchangedData(!!props.modules.find((s: any) => s.isModified));
    }, [saveUnchangedData, props.modules])

    const _saveSequence = () => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (saveUnchangedData) {
            props.updateSequence({ ...props.route.params?.sequenceData, modules: props.modules, isModified: saveUnchangedData });
        }
        props.navigation.goBack();
    }

    return (
        <Box rounded="xl" style={BoxFormStyle.boxForm}>
            {props.modules.map((module: any) => module.id && module.id.indexOf('deleted_') > -1 ? null : elementStack(module, (item: any) => {
                deleteModule(item)
            }, `port number ${module.portNum}`, { name: faMinus, color: 'red' }))}
            <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                <SelectForm lstData={getPorts(props.modules.map((x: any) => Number(x.portNum)))} control={control} errors={errors} name="modules" placeholder="Select Port number" rules={{ required: false }} onValueChange={(value) => { handleSubmit(onSubmit)(); }} />
            </VStack>
        </Box>
    );

}

const mapStateToProps = (state: any) => ({
    modules: state.sequence_module.modules,
});

export default connect(mapStateToProps, {
    loadModules,
    updateModule,
    updateSequence,

})(SequenceModulesSettingsSection);