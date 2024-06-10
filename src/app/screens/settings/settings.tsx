import { IconButton, NativeBaseProvider, VStack, View } from "native-base";
import { Platform, Text } from "react-native";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { AuthVerify } from "../../components/common/AuthVerify";
import Icon from 'react-native-vector-icons/FontAwesome5';


const hapticOptions = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true,
};

const hapticTriggerType: string = Platform.select({
    ios: 'notificationSuccess',
    android: 'impactMedium'
}) as string;

export function SettingsScreen({ navigation }) {
    return (
        <NativeBaseProvider>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: '50%' }} >
                <VStack marginLeft="10" marginRight="10" marginBottom={5} alignSelf='center'>

                    <IconButton alignSelf='center' size={30} icon={<Icon name="sign-out-alt" size={25} color='#32404e' />}
                        onPress={async () => {
                            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                            await AuthVerify.signout();
                            navigation.navigate('Loading')
                        }} />
                    <Text style={{ color: '#32404e', fontSize: 15 }}>
                        logout
                    </Text>
                </VStack>
            </View>
        </NativeBaseProvider>
    );
}