import React from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import {
	faEye,
	faHeadset,
	faGlobe,
	faMicrochip,
	faNetworkWired,
	faShieldHalved,
	faUser
} from '@fortawesome/free-solid-svg-icons';
import {MenuAccordion, MenuGroup} from '../../components/common/cycleMenu';
import {openExternalUrl} from '../../components/common/LegalLinks';
import {PRIVACY_POLICY_URL, SUPPORT_URL} from '../../../../config/env';

// Landing screen of the bottom "Settings" tab: routes to the relocated user
// settings and to the new Modbus devices area. Mirrors the card+MenuAccordion
// layout used by the cycle/trigger settings menus. Logout lives in the user
// settings section (UserSettingsScreen).
export function SettingsMenuScreen(props: any) {
	const {t} = useTranslation(['settings', 'navigation', 'common']);

	return (
		<View style={styles.container}>
			<MenuGroup style={styles.card}>
				<MenuAccordion
					key={1}
					name={t('navigation:userSettings')}
					icon={faUser}
					onPress={() => props.navigation.navigate('UserSettings')}
				/>
				<MenuAccordion
					key={2}
					name={t('navigation:displayManager')}
					icon={faEye}
					onPress={() =>
						props.navigation.navigate('DisplayManager')
					}
				/>
				<MenuAccordion
					key={3}
					name={t('menu.devices')}
					icon={faNetworkWired}
					onPress={() =>
						props.navigation.navigate('DevicesStack', {
							screen: 'Devices'
						})
					}
				/>
				<MenuAccordion
					key={4}
					name={t('navigation:myRpi')}
					icon={faMicrochip}
					onPress={() =>
						props.navigation.navigate('ActuatorsStack', {
							screen: 'Actuators'
						})
					}
				/>
				<MenuAccordion
					key={5}
					name={t('navigation:globalSettings')}
					icon={faGlobe}
					onPress={() =>
						props.navigation.navigate('GlobalSettings')
					}
				/>
				<MenuAccordion
					key={6}
					name={t('common:support')}
					icon={faHeadset}
					onPress={() => openExternalUrl(SUPPORT_URL)}
				/>
				<MenuAccordion
					key={7}
					name={t('common:privacyPolicy')}
					icon={faShieldHalved}
					onPress={() => openExternalUrl(PRIVACY_POLICY_URL)}
				/>
			</MenuGroup>
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
	}
});

export default SettingsMenuScreen;
