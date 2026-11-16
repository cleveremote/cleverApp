import {Alert, Platform, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import React, {useCallback} from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
	deleteProfile,
	getAllProfiles
} from '../../components/common/RememberMeManager';
import {useFocusEffect} from '@react-navigation/native';
import Logo from '../../../../hydrophyto.svg';
import {useTranslation} from 'react-i18next';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

const hapticTriggerType: string = Platform.select({
	ios: 'notificationSuccess',
	android: 'impactMedium'
}) as string;

export function ProfilesScreen(props: any) {
	const {t} = useTranslation(['access', 'common']);
	const [profiles, setProfiles] = React.useState<string[]>([]);
	// Déconnexion après changement de mot de passe : on passe directement à
	// la connexion de ce login et de son profil, le nouveau mot de passe
	// pré-rempli, par-dessus les profils (le
	// retour y ramène). Lu une fois l'écran monté : avant, la navigation de
	// la pile n'est pas encore prête et l'action serait perdue.
	React.useEffect(() => {
		const pending = authenticationService.takePendingSignin();
		if (!pending) return;
		props.navigation.navigate('Signin', {
			login: pending.login,
			profile: pending.profile,
			passwordChanged: true,
			// Même pré-remplissage qu'au retour de « mot de passe oublié ».
			resetPassword: pending.password
		});
	}, [props.navigation]);

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
									onLongPress={() => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										Alert.alert(
											t('profiles.deleteTitle'),
											t('profiles.deleteMessage', {
												profile
											}),
											[
												{
													text: t('common:cancel'),
													style: 'cancel'
												},
												{
													text: t(
														'profiles.deleteConfirm'
													),
													style: 'destructive',
													onPress: async () => {
														await deleteProfile(
															profile
														);
														const profiles1 =
															await getAllProfiles();
														setProfiles(profiles1);
													}
												}
											]
										);
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
								{t('profiles.add')}
							</Text>
						</View>
						<Text style={{color: '#32404e', fontSize: 15}}>
							{t('profiles.deleteHint')}
						</Text>
					</View>
				</ScrollView>
			</View>

			<View
				style={{
					flexDirection: 'row',
					marginBottom: 20,
					alignSelf: 'center',
					alignItems: 'flex-start',
					justifyContent: 'center'
				}}>
				<View style={{alignItems: 'center'}}>
					<TouchableOpacity
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate('ScanBox');
						}}>
						<Icon name="qrcode" size={25} color="#32404e" />
					</TouchableOpacity>
					<Text style={{color: '#32404e', fontSize: 15}}>
						{t('profiles.scanBox')}
					</Text>
				</View>
			</View>
		</View>
	);
}
