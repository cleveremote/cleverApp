import React, {useEffect, useRef} from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../components/common/cycleMenu';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faEthernet,
	faGear,
	faShieldHalved
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../data/cycleTypes';
import {
	loadSequence,
	saveSequence
} from '../../../../../module/process/infrasctructure/store/actions/sequence';

function SequenceSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.item?.id);

	const checkChanges = (e: any) => {
		if (!isModified.current) {
			return;
		}
		saveSequence(props.sequence, true, true);
	};

	const _deleteItem = () => {
		const data = {...props.sequence, id: `deleted_${props.sequence.id}`};
		saveSequence(data, false, true);
	};

	const saveSequence = (sequence: any, haptic: boolean, goBack: boolean) => {
		if (haptic) {
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		}
		isModified.current = false;
		props.saveSequence(sequence);
		if (goBack) {
			props.navigation.goBack();
		}
	};

	useEffect(() => {
		props.loadSequence(props.route.params.item?.id);
	}, []);

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
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				checkChanges(e);
			}
		);
		isModified.current = props.sequence?.isModified;
		return () => listenerUnsubscribe();
	}, [props.sequence]);

	return (
			<View style={{alignSelf: 'stretch', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.22, shadowRadius: 2.22}}>
				<View style={{alignSelf: 'stretch', backgroundColor: 'white', marginTop: 8, marginHorizontal: 20, borderRadius: 12}}>
					<View>
						<View>
							<MenuAccordion
								key={21}
								name={'General'}
								icon={faGear}
								onPress={() => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									props.navigation.navigate(
										'SequenceGeneralSection',
										{
											sequenceData: props.sequence
										}
									);
								}}
							/>
							<MenuAccordion
								key={41}
								name={'Security'}
								icon={faShieldHalved}
								onPress={() => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									props.navigation.navigate(
										'SequenceSecuritySection',
										{
											sequenceData: props.sequence
										}
									);
								}}
							/>

							<MenuAccordion
								key={51}
								name={'Modules'}
								icon={faEthernet}
								onPress={() => {
									ReactNativeHapticFeedback.trigger(
										'impactMedium',
										hapticOptions
									);
									props.navigation.navigate(
										'SequenceModulesSettingsSection',
										{
											sequenceData: props.sequence
										}
									);
								}}
							/>

							<DeleteItemMenu
								key={61}
								OnConfirm={() => {
									_deleteItem();
								}}
							/>
						</View>
					</View>
				</View>
			</View>
	);
}

const mapStateToProps = (state: any) => ({
	sequence: state.cycle_sequence.sequence
});

export default connect(mapStateToProps, {
	saveSequence,
	loadSequence
})(SequenceSettingsScreen);
