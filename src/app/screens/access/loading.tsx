import { Platform, Text } from "react-native";
import React, { useCallback } from "react";
import { Box, IconButton, NativeBaseProvider, ScrollView, VStack, View } from "native-base";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { deleteProfile, getAllProfiles } from "../../components/common/RememberMeManager";
import { useFocusEffect } from "@react-navigation/native";
import Logo from "../../../../hydrophyto.svg";

const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

export function ProfilesScreen(props: any) {
    const [profiles, setProfiles] = React.useState<string[]>([]);



    useFocusEffect(
        useCallback(() => {
            const profiles = async () => {
                const profiles = await getAllProfiles();
                setProfiles(profiles);
            }
            profiles();
        }, [])
    )

    return (
        <NativeBaseProvider>
            <View alignItems="center" marginTop={35}>
                <Logo width={"70"} height={"70"} />
                <Text style={{ color: '#32404e', fontSize: 20, fontWeight: 'bold' }}>
                    HYDRO-PHYTO
                </Text>
            </View>

            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>


                <ScrollView showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}  >
                    <View style={{ alignItems: 'center' }} >
                        {profiles.map((profile, index) =>
                            <Box key={`profile_` + index} >
                                <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" icon={<Icon name="server" size={40} color='#32404e' />}
                                    onLongPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        await deleteProfile(profile);
                                        const profiles1 = await getAllProfiles();
                                        setProfiles(profiles1);
                                    }}
                                    onPress={async () => {
                                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                        props.navigation.navigate('Signin', { profile });
                                    }} />
                                <Text style={{ color: '#32404e', fontSize: 15, alignSelf: 'center' }}>
                                    {profile}
                                </Text>
                            </Box>
                        )}
                        <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" marginTop={5} style={{ transform: [{ rotate: '135deg' }] }} size={30} icon={<Icon name={'times-circle'} size={30} color='#32404e' />}
                                onPress={async () => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    props.navigation.navigate('Signin');
                                }} />
                            <Text style={{ color: '#32404e', fontSize: 15 }}>
                                Add new box ...
                            </Text>
                        </VStack>
                        <Text style={{ color: '#32404e', fontSize: 15 }}>
                            (Long press to delete)
                        </Text>
                    </View>
                </ScrollView>
            </View>

            <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>

                <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" alignSelf='center' size={30} icon={<Icon name="wifi" size={25} color='#32404e' />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        console.log('open execution settings');
                        props.navigation.navigate('Device');
                    }} />
                <Text style={{ color: '#32404e', fontSize: 15 }}>
                    Connectivity settings
                </Text>
            </VStack>
        </NativeBaseProvider>
    )
}