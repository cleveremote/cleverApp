import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faFlask,
	faPowerOff,
	faSliders,
	faSyncAlt
} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {MenuAccordion, MenuGroup} from '../../components/common/cycleMenu';
import {hapticOptions} from '../../data/cycleTypes';

export function CycleMenuScreen(props: any) {
	const {t} = useTranslation('cycle');
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

	// All create entries open the shared cycle settings menu; the params tell
	// it which kind of entity to instantiate (plain cycle, GROUP fertigation,
	// MODULE or PROPORTIONAL).
	const openCreate = (params: any) => {
		props.navigation.navigate('Settings', {
			screen: 'CycleSettingsMenu',
			params
		});
	};

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
					name={t('create.cycle')}
					icon={faSyncAlt}
					onPress={() => openCreate({})}
				/>
				<MenuAccordion
					key={31}
					name={t('create.fertigation')}
					icon={faFlask}
					onPress={() => openCreate({isGroup: true})}
				/>
				<MenuAccordion
					key={41}
					name={t('create.module')}
					icon={faPowerOff}
					onPress={() => openCreate({type: 'MODULE'})}
				/>
				<MenuAccordion
					key={51}
					name={t('create.proportional')}
					icon={faSliders}
					onPress={() => openCreate({type: 'PROPORTIONAL'})}
				/>
			</MenuGroup>
		</View>
	);
}

export default CycleMenuScreen;
