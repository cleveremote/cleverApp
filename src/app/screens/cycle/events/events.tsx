import { Box, FlatList, Flex, Heading, IconButton, NativeBaseProvider, ScrollView, VStack, View } from "native-base";
import { Platform, Text } from "react-native";
import { connect } from "react-redux";
import Spinner from "react-native-loading-spinner-overlay";
import { useCallback, useEffect, useState } from "react";
import { loadValues } from "../../../../module/process/infrasctructure/store/actions/cycle";
import { styles } from "../../../styles/cycleStyles";
import { DateTimePickerForm } from "../../../components/common/FormComponents";
import { useForm } from "react-hook-form";
import { BoxFormStyle } from "../../../styles/components/common/boxForm";
import { navigationHeader } from "../../../components/common/navigationHeaders";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

function EventsScreen(props: any) {
    const getTimeString = (dateValue: number) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return new Date(date.getTime() + dateValue);
    }
    const defaultValues = { startDate: getTimeString(0), endDate: new Date() };
    const [maximumDate, setMaximumDate] = useState(new Date());
    const [minimumDate, setMinimumDate] = useState(getTimeString(0));

    const { control, handleSubmit, formState: { errors }, setValue, register } = useForm({ defaultValues })

    const onSubmit = (data: any) => {
        props.loadValues('DATA', { startDate: data.startDate, endDate: data.endDate, deviceId: props.route.params.cycle.id });
    }

    const [refreshing, setRefreshing] = useState<boolean>(false);
    const onRefresh = async () => {
        setRefreshing(true);
        handleSubmit(onSubmit)();
        setRefreshing(false);
    }
    useEffect(() => {
    }, [props.data])

    useEffect(() => {
        props.navigation.setOptions({
            headerLeft: () => navigationHeader(() => {
                ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                props.navigation.goBack()
            }, 'arrow-alt-circle-left', false)
        });
        handleSubmit(onSubmit)();
    }, [])


    const renderItem = useCallback(({ item }: { item: any }) => {
        const date = new Date(item.date);
        return < View key={item.key} my={1} >
            <Box alignSelf="stretch" bg={"white"} rounded="xl" shadow={3} height='45' mx={1}>
                <View style={{ flexDirection: 'row' }} mt={1} mx={2}>
                    <Box zIndex={99} style={{ flex: 2, alignItems: 'flex-start' }} mr={0}>
                        <Flex direction="row">
                            <Heading flex={2} mt={1} ml={2} size="sm" color={"balck"} numberOfLines={1} fontSize={15} ellipsizeMode="middle">
                                {date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear() + " " +
                                    date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()} : {item.type} SWITCH {item.value}
                            </Heading>
                        </Flex>
                    </Box>
                </View>
            </Box>
        </View>
    }, []);

    return (



        <VStack space={2} my={1} alignSelf="stretch">
            <Box rounded="xl" style={BoxFormStyle.boxForm}>
                <DateTimePickerForm mode={"datetime"} control={control} errors={errors} name="startDate" placeholder="Get logs from :" rules={{ required: true }} maximumDate={maximumDate} onChangeText={(value: any) => {
                    const now = new Date();
                    setMaximumDate(now);
                    setMinimumDate(value);
                    setTimeout(() => {
                        handleSubmit(onSubmit)();
                    }, 200);

                }} />
                <DateTimePickerForm mode={"datetime"} control={control} errors={errors} name="endDate" placeholder="to :" rules={{ required: true }} minimumDate={minimumDate} maximumDate={maximumDate}
                    onChangeText={(value: any) => {
                        setTimeout(() => {
                            handleSubmit(onSubmit)();
                        }, 200);

                    }} />
            </Box>
            <Spinner visible={props.isLoading} color='#32404e' textStyle={styles.spinnerTextStyle} animation="fade" />
            <FlatList
                data={props.data}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                onRefresh={() => onRefresh()}
                refreshing={refreshing}
            />
        </VStack>
    );
}

const mapStateToProps = (state: any) => ({
    data: state.root_cycle.data,
});

export default connect(mapStateToProps, {
    loadValues
})(EventsScreen);