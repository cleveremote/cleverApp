import React, {useEffect} from 'react';
import i18n from 'i18next';
import {View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {faPlus} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {MenuAccordion, MenuGroup} from '../../components/common/cycleMenu';
import {hapticOptions} from '../../data/cycleTypes';

export function SensorMenuScreen(props: any) {
	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => {
						ReactNativeHapticFeedback.trigger(
							'impactMedium',
							hapticOptions
						);
						props.navigation.goBack();
					},
					'arrow-alt-circle-left',
					false
				)
		});
	}, []);

	return (
		<View style={{alignSelf: 'stretch'}}>
			<MenuGroup
				style={{
					alignSelf: 'stretch',
					backgroundColor: 'white',
					marginTop: 8,
					marginHorizontal: 20,
					borderRadius: 12,
					elevation: 3,
					shadowColor: '#000',
					shadowOffset: {width: 0, height: 1},
					shadowOpacity: 0.22,
					shadowRadius: 2.22
				}}>
				<MenuAccordion
					key={21}
					name={i18n.t('sensor:create')}
					icon={faPlus}
					onPress={() => {
						props.navigation.navigate('Settings', {
							screen: 'SensorSettingsMenu',
							params: null
						});
					}}
				/>
			</MenuGroup>
		</View>
	);
}

export default SensorMenuScreen;
