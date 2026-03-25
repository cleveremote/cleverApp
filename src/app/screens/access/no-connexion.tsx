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
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
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
			};
			profiles();
		}, [])
	);

	return (
		<View style={{flex: 1}}>
			<View style={{alignItems: 'center', marginTop: 35}}>
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
					<View style={{alignItems: 'center'}}>
						{props.type === 'BOX' ? (
							<>
								<Text
									style={{
										color: '#32404e',
										fontSize: 20,
										fontWeight: 'bold'
									}}>
									No connexion established ! {props.type}
								</Text>
								<Text style={{color: '#32404e', fontSize: 15}}>
									please try later...
								</Text>
								<View
									style={{
										justifyContent: 'center',
										alignItems: 'center'
									}}>
									<TouchableOpacity
										style={{marginTop: 20}}
										onPress={async () => {
											ReactNativeHapticFeedback.trigger(
												'impactMedium',
												hapticOptions
											);
											await authenticationService.signout();
										}}>
										<Icon
											name={'redo-alt'}
											size={30}
											color="#32404e"
										/>
									</TouchableOpacity>
								</View>
							</>
						) : (
							<Text style={{color: '#32404e', fontSize: 20}}>
								Auto attempt connect to server ...
							</Text>
						)}
					</View>
				</ScrollView>
			</View>
		</View>
	);
}
