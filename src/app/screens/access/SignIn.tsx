import React from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	Alert,
	TouchableOpacity,
	View
} from 'react-native';
import {AppSwitch} from '../../components/common/AppSwitch';
import {placeholderColor} from '../../styles/components/common/Input';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../data/cycleTypes';
import Spinner from 'react-native-loading-spinner-overlay';
import {getSigninData} from '../../components/common/RememberMeManager';
import Logo from '../../../../hydrophyto.svg';
import {connect} from 'react-redux';
import {
	login,
	setIsConnected
} from '../../../module/process/infrasctructure/store/actions/state';
import {useNavigation} from '@react-navigation/native';
import {
	brandLogo,
	navigationHeader
} from '../../components/common/navigationHeaders';

export function SignIn(props: any) {
	const [signinData, setSigninData] = React.useState({
		login: '',
		password: '',
		rememberCredentials: false,
		profile: ''
	});
	const [isLoading, setIsLoading] = React.useState(false);
	const nav = useNavigation();
	React.useEffect(() => {
		nav.setOptions({
			headerTitleAlign: 'center',
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		const fetchCredentials = async (profile: string) => {
			try {
				const sd = await getSigninData(profile);
				if (sd) {
					setSigninData(sd);
					if (sd.login && sd.password && sd.profile) {
						//await onLogin(sd);
					} else {
						Alert.alert('Required information missing!');
					}
				}
			} catch (error) {
				console.error('Error fetching checkValue or email:', error);
			}
		};

		if (props.route.params?.profile) {
			fetchCredentials(props.route.params.profile);
		}
	}, []);

	const onLogin = async (data: any) => {
		setIsLoading(true);
		props
			.login(
				data.login,
				data.password,
				data.rememberCredentials,
				data.profile,
				props.route.params?.profile
			)
			.then((res: any) => {
				if (res.error) {
					Alert.alert(res.error);
					setIsLoading(false);
				}
			})
			.catch((error: any) => {
				console.error('Error caught:', error);
				setIsLoading(false);
			});
	};

	return (
		<View style={{flex: 1, marginTop: 25}}>
			<View style={{gap: 16, alignItems: 'center'}}>
				<Spinner
					visible={isLoading}
					color="#32404e"
					textStyle={styles.spinnerTextStyle}
				/>
				<View style={{alignItems: 'center'}}>
					<Logo width={'70'} height={'70'} />
				</View>
				<View
					style={{
						gap: 8,
						marginVertical: 4,
						alignSelf: 'stretch'
					}}>
					<View
						style={{
							alignSelf: 'stretch',
							backgroundColor: 'white',
							marginTop: 8,
							marginHorizontal: 20,
							borderRadius: 12,
							padding: 20,
							elevation: 3,
							shadowColor: '#000',
							shadowOffset: {width: 0, height: 1},
							shadowOpacity: 0.22,
							shadowRadius: 2.22
						}}>
						<View style={{gap: 8}}>
							<TextInput
								value={
									signinData.rememberCredentials
										? signinData.profile
										: undefined
								}
								style={styles.input}
								placeholder="Profile"
								placeholderTextColor={placeholderColor}
								onChangeText={profile => {
									setSigninData({
										login: signinData.login,
										password: signinData.password,
										rememberCredentials:
											signinData.rememberCredentials,
										profile
									});
								}}
							/>
							<TextInput
								value={
									signinData.rememberCredentials
										? signinData.login
										: undefined
								}
								textContentType={'username'}
								style={styles.input}
								placeholder="Box id"
								placeholderTextColor={placeholderColor}
								onChangeText={login => {
									setSigninData({
										login,
										password: signinData.password,
										rememberCredentials:
											signinData.rememberCredentials,
										profile: signinData.profile
									});
								}}
							/>
							<TextInput
								style={styles.input}
								placeholder="Password"
								placeholderTextColor={placeholderColor}
								secureTextEntry={true}
								textContentType={'newPassword'}
								value={
									signinData.rememberCredentials
										? signinData.password
										: undefined
								}
								onChangeText={password => {
									setSigninData({
										login: signinData.login,
										password,
										rememberCredentials:
											signinData.rememberCredentials,
										profile: signinData.profile
									});
								}}
							/>

							<View
								style={{
									flexDirection: 'row',
									marginLeft: 40,
									marginRight: 40,
									alignSelf: 'center',
									alignItems: 'center'
								}}>
								<AppSwitch
									style={{marginRight: 12}}
									value={signinData.rememberCredentials}
									onValueChange={checked => {
										setSigninData({
											login: signinData.login,
											password: signinData.password,
											rememberCredentials: checked,
											profile: signinData.profile
										});
									}}
								/>
								<Text
									style={{
										marginTop: 5,
										color: '#32404e',
										fontSize: 15
									}}>
									{' '}
									Remember me
								</Text>
							</View>
							<View
								style={{
									marginLeft: 40,
									marginRight: 40,
									marginBottom: 20,
									alignSelf: 'center'
								}}>
								{/* <IconButton
									_pressed={{_icon: {size: 35}}}
									variant="unstyled"
									alignSelf="center"
									size={35}
									icon={
										<Icon
											name={'id-badge'}
											size={30}
											color="#32404e"
										/>
									}
									onPress={() => {
										ReactNativeHapticFeedback.trigger(
											'impactMedium',
											hapticOptions
										);
										props.navigation.goBack();
									}}
								/>
								<Text
									style={{
										color: '#32404e',
										fontSize: 15
									}}>
									back to profiles
								</Text> */}
							</View>

							<TouchableOpacity
								style={{
									alignSelf: 'stretch',
									height: 50,
									backgroundColor: '#32404e',
									justifyContent: 'center',
									alignItems: 'center',
									borderRadius: 6
								}}
								onPress={async () => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									await onLogin(signinData);
								}}>
								<Text style={{color: 'white', fontSize: 20}}>
									{' '}
									Sign in{' '}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>

			{/* <VStack
				marginLeft="10"
				marginRight="10"
				marginBottom={5}
				alignSelf="center">
				<IconButton
					_pressed={{_icon: {size: 35}}}
					variant="unstyled"
					alignSelf="center"
					size={35}
					icon={
						<Icon
							name={'arrow-alt-circle-left'}
							size={30}
							color="#32404e"
						/>
					}
					onPress={() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.navigate('Profiles');
					}}
				/>
			</VStack> */}
		</View>
	);
}

const mapStateToProps = function (state: any) {
	return {
		isConnected: state.status?.isConnected
	};
};

export default connect(mapStateToProps, {
	login,
	setIsConnected
})(SignIn);

const styles = StyleSheet.create({
	input: {
		height: 50,
		fontSize: 20,
		borderWidth: 1,
		borderColor: '#CBD5E0',
		borderRadius: 12,
		paddingHorizontal: 12,
		color: '#32404e'
	},
	spinnerTextStyle: {
		color: '#32404e',
		fontSize: 15,
		marginBottom: 50
	}
});
