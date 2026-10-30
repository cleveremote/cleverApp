import React, {useEffect} from 'react';
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faEye,
	faGlobe,
	faMicrochip,
	faNetworkWired,
	faPowerOff,
	faUser
} from '@fortawesome/free-solid-svg-icons';
import {MenuAccordion, MenuGroup} from '../../components/common/cycleMenu';
import {authenticationService} from '../../../module/authentication/domain/services/auth.service';
import {hapticOptions} from '../../data/cycleTypes';

// Landing screen of the bottom "Settings" tab: routes to the relocated user
// settings and to the new Modbus devices area. Mirrors the card+MenuAccordion
// layout used by the cycle/trigger settings menus. The logout action sits in
// the header, top right, as a circled button like the section icons; a long
// press is required so a stray tap doesn't sign the user out.
// Place laissée au libellé du bouton de déconnexion à droite du titre centré :
// moitié de l'écran, moins la demi-largeur du titre, le cercle et les marges.
const HALF_TITLE_WIDTH = 50;
const LOGOUT_CIRCLE_AND_MARGINS = 35 + 10 + 6 + 8;

export function SettingsMenuScreen(props: any) {
	const {width} = useWindowDimensions();
	const hintMaxWidth = width / 2 - HALF_TITLE_WIDTH - LOGOUT_CIRCLE_AND_MARGINS;

	useEffect(() => {
		props.navigation.setOptions({
			headerRight: () => (
				<TouchableOpacity
					style={styles.logoutButton}
					onLongPress={async () => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						await authenticationService.signout();
					}}>
					<Text
						style={[styles.logoutHint, {maxWidth: hintMaxWidth}]}
						numberOfLines={1}
						adjustsFontSizeToFit
						minimumFontScale={0.5}>
						(Long press to logout)
					</Text>
					<View style={styles.logoutCircle}>
						<FontAwesomeIcon
							icon={faPowerOff}
							size={16}
							color={COLORS.logout}
						/>
					</View>
				</TouchableOpacity>
			)
		});
	}, [props.navigation, hintMaxWidth]);

	return (
		<View style={styles.container}>
			<MenuGroup style={styles.card}>
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
					icon={faNetworkWired}
					onPress={() =>
						props.navigation.navigate('DevicesStack', {
							screen: 'Devices'
						})
					}
				/>
				<MenuAccordion
					key={4}
					name={'My RPI'}
					icon={faMicrochip}
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
					onPress={() =>
						props.navigation.navigate('GlobalSettings')
					}
				/>
			</MenuGroup>
		</View>
	);
}

const COLORS = {
	shadow: '#000',
	cardBackground: 'white',
	text: '#32404e',
	logout: '#E53E3E'
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
	logoutButton: {
		marginHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center'
	},
	logoutHint: {
		marginRight: 6,
		color: COLORS.logout,
		// Taille max : réduite automatiquement pour tenir sur une ligne.
		fontSize: 12
	},
	// Même cercle que les icônes des sections (MenuAccordion).
	logoutCircle: {
		width: 35,
		height: 35,
		borderRadius: 0.5 * 45,
		justifyContent: 'center',
		alignItems: 'center',
		borderColor: COLORS.logout,
		borderWidth: 2.5
	}
});

export default SettingsMenuScreen;
