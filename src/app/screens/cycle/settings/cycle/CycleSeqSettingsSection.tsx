import {Text, TouchableOpacity, View} from 'react-native';
import React, {useCallback, useEffect, useRef} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {hapticOptions} from '../../../../data/cycleTypes';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import {DragableForm} from '../../../../components/common/FormComponents';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {
	loadSequences,
	updateSequencesOder
} from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SeqSettingsSec(props: any) {
	const defaultValues = {...props.route.params?.cycleData};
	const sequencesRef = useRef(props.sequences);
	sequencesRef.current = props.sequences;
	const updateCycleRef = useRef(props.updateCycle);
	updateCycleRef.current = props.updateCycle;
	const cycleDataRef = useRef(props.route.params.cycleData);
	cycleDataRef.current = props.route.params.cycleData;

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue
	} = useForm({defaultValues});

	const updateSeqeuncesOrder = (data: any) => {
		props.updateSequencesOder(data.sequences);
	};

	useFocusEffect(
		useCallback(() => {
			const hasModified = !!sequencesRef.current?.find(
				(x: any) => x.isModified
			);
			if (hasModified || cycleDataRef.current.isModified) {
				updateCycleRef.current({
					...cycleDataRef.current,
					sequences: sequencesRef.current,
					isModified: true
				});
			}
		}, [])
	);

	const checkChanges = (e: any) => {
		const hasModified = !!sequencesRef.current?.find(
			(x: any) => x.isModified
		);
		if (hasModified || cycleDataRef.current.isModified) {
			updateCycleRef.current({
				...cycleDataRef.current,
				sequences: sequencesRef.current,
				isModified: true
			});
		}
	};

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

		props.loadSequences(props.route.params.cycleData);
	}, []);

	useEffect(() => {
		console.log('sequences updated123', props.sequences);
		setValue('sequences', props.sequences, {shouldValidate: true});
		props.updateCycle({
			...props.route.params.cycleData,
			sequences: props.sequences,
			isModified:
				props.route.params.cycleData.isModified ||
				!!props.sequences.find((x: any) => x.isModified)
		});
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				checkChanges(e);
			}
		);
		return () => listenerUnsubscribe();
	}, [props.sequences]);

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
				<DragableForm
					isList={true}
					navigation={props.navigation}
					parentId={props.route.params.cycleData.id}
					control={control}
					errors={errors}
					name="sequences"
					onDragEnd={() => handleSubmit(updateSeqeuncesOrder)()}
				/>
				<View style={{justifyContent: 'center', alignItems: 'center'}}>
					<TouchableOpacity
						style={{marginTop: 20, transform: [{rotate: '135deg'}]}}
						onPress={() => {
							ReactNativeHapticFeedback.trigger(
								'impactMedium',
								hapticOptions
							);
							props.navigation.navigate('SequenceSettingsStack', {
								screen: 'SequenceSettingsMenu',
								params: {
									cycleId: props.route.params.cycleData.id
								}
							});
						}}>
						<Icon name="times-circle" size={30} color="#32404e" />
					</TouchableOpacity>
					<Text style={{color: '#32404e', fontSize: 15}}>
						Add new sequence ...
					</Text>
				</View>
			</View>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	sequences: state.cycle_sequence.sequences,
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	updateSequencesOder,
	loadSequences,
	updateCycle
})(SeqSettingsSec);
