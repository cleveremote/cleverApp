import {Platform, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import React, {useCallback} from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
	deleteProfile,
	getAllProfiles
} from '../../components/common/RememberMeManager';
import {useFocusEffect} from '@react-navigation/native';
import Logo from '../../../../hydrophyto.svg';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
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
			};
			profiles();
		}, [])
	);

	return (
		<View style={{flex: 1}}>
			<View style={{alignItems: 'center', marginTop: 70}}>
				<Logo width={'70'} height={'70'} />
				<Text
					style={{
						color: '#32404e',
						fontSize: 20,
						fontWeight: 'bold'
					}}>
					HYDRO-PHYTO
				</Text>
			</View>

			<View
				style={{
					flex: 1,
					flexDirection: 'row',
					justifyContent: 'center',
					alignItems: 'center'
				}}>
				<ScrollView
					showsVerticalScrollIndicator={false}
					showsHorizontalScrollIndicator={false}>
					<View
						style={{alignItems: 'center', flexDirection: 'column'}}>
						{profiles.map((profile, index) => (
							<View
								key={`profile_` + index}
								style={{
									alignItems: 'center',
									marginBottom: 20
								}}>
								<TouchableOpacity
									onLongPress={async () => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										await deleteProfile(profile);
										const profiles1 =
											await getAllProfiles();
										setProfiles(profiles1);
									}}
									onPress={async () => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										props.navigation.navigate('Signin', {
											profile
										});
									}}>
									<Icon
										name="server"
										size={40}
										color="#32404e"
									/>
								</TouchableOpacity>
								<Text
									style={{
										color: '#32404e',
										fontSize: 15,
										alignSelf: 'center'
									}}>
									{profile}
								</Text>
							</View>
						))}
						<View
							style={{
								justifyContent: 'center',
								alignItems: 'center'
							}}>
							<TouchableOpacity
								style={{
									marginTop: 20,
									transform: [{rotate: '135deg'}]
								}}
								onPress={async () => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									props.navigation.navigate('Signin');
								}}>
								<Icon
									name={'times-circle'}
									size={30}
									color="#32404e"
								/>
							</TouchableOpacity>
							<Text style={{color: '#32404e', fontSize: 15}}>
								Add new profil ...
							</Text>
						</View>
						<Text style={{color: '#32404e', fontSize: 15}}>
							(To delete long press on profile)
						</Text>
					</View>
				</ScrollView>
			</View>

			<View
				style={{
					marginLeft: 40,
					marginRight: 40,
					marginBottom: 20,
					alignSelf: 'center',
					alignItems: 'center'
				}}>
				<TouchableOpacity
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.navigate('Device');
					}}>
					<Icon name="wifi" size={25} color="#32404e" />
				</TouchableOpacity>
				<Text style={{color: '#32404e', fontSize: 15}}>
					Connectivity settings
				</Text>
			</View>
		</View>
	);
}
