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

export function NoConnectionScreen(props: any) {
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
                        {(props.type === 'BOX') ? (
                            <>
                                <Text style={{ color: '#32404e', fontSize: 20, fontWeight: 'bold' }}>
                                    No connexion established ! {props.type}
                                </Text>
                                <Text style={{ color: '#32404e', fontSize: 15 }}>
                                    please try later...
                                </Text>
                                <VStack style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" marginTop={5} size={30} icon={<Icon name={'redo-alt'} size={30} color='#32404e' />}
                                        onPress={async () => {
                                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                            // props.navigation.navigate('Signin');
                                        }} />

                                </VStack>
                            </>
                        ) : (
                            <Text style={{ color: '#32404e', fontSize: 20 }}>
                                Auto attempt connect to server ...
                            </Text>
                        )

                        }



                    </View>
                </ScrollView>
            </View>


        </NativeBaseProvider>
    )
}