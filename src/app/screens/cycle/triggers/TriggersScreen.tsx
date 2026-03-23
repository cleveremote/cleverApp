import {TouchableOpacity, View, Text} from 'react-native';
import React, {useEffect, useRef} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {elementStack} from '../../../components/cycle/moduleStack';
import {hapticOptions} from '../../../data/cycleTypes';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {loadTriggers} from '../../../../module/process/infrasctructure/store/actions/trigger';
import {saveCycle} from '../../../../module/process/infrasctructure/store/actions/cycle';
import cycle from '../../../../module/process/infrasctructure/store/reducers/cycle';

export function TriggersScreen(props: any) {
	const cycleParamRef = useRef(props.route.params.cycle);

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		props.loadTriggers(cycleParamRef.current);
	}, []);

	useEffect(() => {
		console.log('triggers updated', props.triggers);
		cycleParamRef.current = {
			...cycleParamRef.current,
			triggers: props.triggers
		};
		props.saveCycle(
			{...cycleParamRef.current, triggers: props.triggers},
			true
		);
	}, [props.triggers]);

	return (
		<View
			style={{
				gap: 8,
				marginVertical: 4,
				alignSelf: 'stretch',
				margin: 20,
				elevation: 3,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 1},
				shadowOpacity: 0.22,
				shadowRadius: 2.22
			}}>
			<View
				style={{
					alignSelf: 'stretch',
					backgroundColor: 'white',
					borderRadius: 12,
					padding: 8
				}}>
				{props.triggers.map((element: any) =>
					element.id && element.id.indexOf('deleted_') > -1
						? null
						: elementStack(
								element,
								(item: any) => {
									props.navigation.navigate(
										'TriggerSettingsStack',
										{
											screen: 'TriggerSettingsMenu',
											params: {
												trigger: item,
												cycle: cycleParamRef.current
											}
										}
									);
								},
								`trigger ${element.description}`,
								{name: faCog, color: '#32404e'}
						  )
				)}
				<View style={{justifyContent: 'center', alignItems: 'center'}}>
					<TouchableOpacity
						style={{marginTop: 20, transform: [{rotate: '135deg'}]}}
						onPress={async () => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate('TriggerSettingsStack', {
								screen: 'TriggerSettingsMenu',
								params: {
									cycle: cycleParamRef.current
								}
							});
						}}>
						<Icon name="times-circle" size={30} color="#32404e" />
					</TouchableOpacity>
					<Text style={{color: '#32404e', fontSize: 15}}>
						Add new trigger ...
					</Text>
				</View>
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	triggers: state.cycle_trigger.triggers
});

export default connect(mapStateToProps, {
	loadTriggers,
	saveCycle
})(TriggersScreen);
