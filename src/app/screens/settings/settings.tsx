import { IconButton, NativeBaseProvider, VStack, View } from "native-base";
import { Platform, Text } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import { authenticationService } from "../../../module/authentication/domain/services/auth.service";

const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

export function SettingsScreen(props: any) {
    return (
        <NativeBaseProvider>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: '50%' }} >
                <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>
                    <IconButton _pressed={{ _icon: { size:35} }} variant="unstyled" alignSelf='center' size={30} icon={<Icon name="sign-out-alt" size={25} color='#32404e' />}
                        onPress={async () => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            await authenticationService.signout();
                        }} />
                    <Text style={{ color: '#32404e', fontSize: 15 }}>
                        logout
                    </Text>
                </VStack>
            </View>
        </NativeBaseProvider>
    );
}