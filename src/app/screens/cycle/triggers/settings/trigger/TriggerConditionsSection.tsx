import {TouchableOpacity, View, Text} from 'react-native';
import {useEffect} from 'react';
import Icon from 'react-native-vector-icons/FontAwesome5';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {connect} from 'react-redux';
import {faCog} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../../data/cycleTypes';
import {elementStack} from '../../../../../components/cycle/moduleStack';
import {navigationHeader} from '../../../../../components/common/navigationHeaders';
import {loadConditions} from '../../../../../../module/process/infrasctructure/store/actions/condition';
import {updateTrigger} from '../../../../../../module/process/infrasctructure/store/actions/trigger';

function TriggerConditionsSection(props: any) {
	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					() => props.navigation.goBack(),
					'arrow-alt-circle-left',
					false
				)
		});
		props.loadConditions(props.route.params.triggerData);
	}, []);

	useEffect(() => {
		props.updateTrigger({
			...props.route.params.triggerData,
			conditions: props.conditions,
			isModified: !!props.conditions.find((x: any) => x.isModified)
		});
	}, [props.conditions]);

	return (
			<View style={{gap: 8, marginVertical: 4, alignSelf: 'stretch', margin: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.22, shadowRadius: 2.22}}>
				<View style={{alignSelf: 'stretch', backgroundColor: 'white', borderRadius: 12, padding: 8}}>
					{props.conditions.map((element: any) =>
						element.id && element.id.indexOf('deleted_') > -1
							? null
							: elementStack(
									element,
									(item: any) => {
										props.navigation.navigate(
											'ConditionSettingsStack',
											{
												screen: 'TriggerConditionSettingsScreen',
												params: {
													trigger:
														props.route.params
															.triggerData,
													condition: item
												}
											}
										);
									},
									`condition ${element.description}`,
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
								props.navigation.navigate(
									'ConditionSettingsStack',
									{
										screen: 'TriggerConditionSettingsScreen',
										params: {
											trigger:
												props.route.params.triggerData
										}
									}
								);
							}}>
							<Icon name='times-circle' size={30} color="#32404e" />
						</TouchableOpacity>
						<Text style={{color: '#32404e', fontSize: 15}}>
							Add new condition ...
						</Text>
					</View>
				</View>
			</View>
	);
}

const mapStateToProps = (state: any) => ({
	conditions: state.trigger_condition.conditions
});

export default connect(mapStateToProps, {
	loadConditions,
	updateTrigger
})(TriggerConditionsSection);
