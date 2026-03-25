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
import {saveCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';

function SequenceSettingsScreen(props: any) {
	const isModified = useRef(!props.route.params.item?.id);
	const sequenceRef = useRef(props.sequence);
	sequenceRef.current = props.sequence;

	const checkChanges = (e: any) => {
		if (!isModified.current && !sequenceRef.current?.isModified) {
			return;
		}
		saveSequence(sequenceRef.current, true, false);
	};

	const _deleteItem = () => {
		const data = {...props.sequence, id: `deleted_${props.sequence.id}`};
		saveSequence(data, false, true);
		const updateSequence = (prevSequences: any, sequence: any) => {
			const previous = [...prevSequences];
			if (sequence) {
				const deleteId = sequence?.id.split('_');
				const index = previous.findIndex(
					x => x.id === (deleteId[1] || sequence?.id)
				);
				if (index > -1) {
					previous[index] = sequence;
				} else {
					previous.push(sequence);
				}
			}
			return previous;
		};
		props.saveCycle({
			...props.cycle,
			sequences: updateSequence(props.cycle.sequences, data)
		});
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
		<View
			style={{
				alignSelf: 'stretch',
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
					marginTop: 8,
					marginHorizontal: 20,
					borderRadius: 12
				}}>
				<View>
					<View>
						<MenuAccordion
							key={21}
							name={'General'}
							icon={faGear}
							onPress={() => {
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
	sequence: state.cycle_sequence.sequence,
	cycle: state.root_cycle.cycle,
	cycles: state.root_cycle.cycles
});

export default connect(mapStateToProps, {
	saveSequence,
	loadSequence,
	saveCycle
})(SequenceSettingsScreen);
