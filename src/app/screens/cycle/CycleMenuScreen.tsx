import React, {useEffect} from 'react';
import {View} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faFlask,
	faPowerOff,
	faSyncAlt
} from '@fortawesome/free-solid-svg-icons';
import {navigationHeader} from '../../components/common/navigationHeaders';
import {MenuAccordion} from '../../components/common/cycleMenu';
import {hapticOptions} from '../../data/cycleTypes';

export function CycleMenuScreen(props: any) {
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
	// or MODULE).
	const openCreate = (params: any) => {
		props.navigation.navigate('Settings', {
			screen: 'CycleSettingsMenu',
			params
		});
	};

	return (
		<View style={{alignSelf: 'stretch'}}>
			<View
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
					name={'Create cycle'}
					icon={faSyncAlt}
					onPress={() => openCreate({})}
				/>
				<MenuAccordion
					key={31}
					name={'Create fertigation'}
					icon={faFlask}
					onPress={() => openCreate({isGroup: true})}
				/>
				<MenuAccordion
					key={41}
					name={'Create module'}
					icon={faPowerOff}
					isLast={true}
					onPress={() => openCreate({type: 'MODULE'})}
				/>
			</View>
		</View>
	);
}

export default CycleMenuScreen;
