import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
	faEye,
	faGlobe,
	faMicrochip,
	faPlug,
	faUser
} from '@fortawesome/free-solid-svg-icons';
import {MenuAccordion} from '../../components/common/cycleMenu';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';
import {hapticOptions} from '../../data/cycleTypes';

// Landing screen of the bottom "Settings" tab: routes to the relocated user
// settings and to the new Modbus devices area. Mirrors the card+MenuAccordion
// layout used by the cycle/trigger settings menus. The logout action, formerly
// buried in the user settings, now sits at the bottom of the sections.
export function SettingsMenuScreen(props: any) {
	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<MenuAccordion
					key={1}
					name={'User Settings'}
					icon={faUser}
					onPress={() => props.navigation.navigate('UserSettings')}
				/>
				<MenuAccordion
					key={2}
					name={'Display manager'}
					icon={faEye}
					onPress={() =>
						props.navigation.navigate('DisplayManager')
					}
				/>
				<MenuAccordion
					key={3}
					name={'Devices'}
					icon={faMicrochip}
					onPress={() =>
						props.navigation.navigate('DevicesStack', {
							screen: 'Devices'
						})
					}
				/>
				<MenuAccordion
					key={4}
					name={'Actuators'}
					icon={faPlug}
					onPress={() =>
						props.navigation.navigate('ActuatorsStack', {
							screen: 'Actuators'
						})
					}
				/>
				<MenuAccordion
					key={5}
					name={'Global settings'}
					icon={faGlobe}
					isLast={true}
					onPress={() =>
						props.navigation.navigate('GlobalSettings')
					}
				/>
			</View>
			<View style={styles.logout}>
				<TouchableOpacity
					style={{alignSelf: 'center'}}
					onPress={async () => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						await authenticationService.signout();
					}}>
					<Icon name="sign-out-alt" size={25} color={COLORS.text} />
				</TouchableOpacity>
				<Text style={styles.logoutLabel}>logout</Text>
			</View>
		</View>
	);
}

const COLORS = {
	shadow: '#000',
	cardBackground: 'white',
	text: '#32404e'
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignSelf: 'stretch'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: COLORS.cardBackground,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: COLORS.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	logout: {
		marginTop: 30,
		alignSelf: 'center',
		alignItems: 'center'
	},
	logoutLabel: {
		color: COLORS.text,
		fontSize: 15
	}
});

export default SettingsMenuScreen;
