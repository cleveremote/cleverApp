import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import React, {useEffect, useRef} from 'react';
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
	saveSequences
} from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SeqSettingsSec(props: any) {
	const cycleParamRef = useRef(props.route.params?.cycleData);
	cycleParamRef.current = props.route.params?.cycleData;

	const sequencesRef = useRef(props.sequences);
	sequencesRef.current = props.sequences;

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue
	} = useForm({...cycleParamRef.current});

	const save = (data: any, e: any) => {
		const sequences = data.sequences || data || [];
		props.saveSequences(sequences, () => {
			props.updateCycle(
				{
					...cycleParamRef.current,
					sequences: sequences,
					isModified: true
				},
				() => {
					e && props.navigation.dispatch(e.data.action);
				}
			);
		});
	};
	const checkChanges = (e: any) => {
		const isModified = !!sequencesRef.current?.find(
			(x: any) => x.isModified
		);
		if (!isModified && !cycleParamRef.current.isModified) return;
		if (!['GO_BACK', 'POP', 'POP_TO_TOP'].includes(e.data.action.type))
			return;
		e.preventDefault();

		save(sequencesRef.current, e);
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
		setValue('sequences', sequencesRef.current, {
			shouldValidate: true
		});
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			checkChanges
		);
		return () => listenerUnsubscribe();
	}, [props.sequences]);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<DragableForm
					isList={true}
					navigation={props.navigation}
					parentId={props.route.params.cycleData.id}
					control={control}
					errors={errors}
					name="sequences"
					onDragEnd={() => handleSubmit(save)()}
				/>
				<View style={styles.addButtonWrapper}>
					<TouchableOpacity
						style={styles.addButton}
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
						<Icon
							name="times-circle"
							size={30}
							color={colors.dark}
						/>
					</TouchableOpacity>
					<Text style={styles.addLabel}>Add new sequence ...</Text>
				</View>
			</View>
		</View>
	);
}

const colors = {
	dark: '#32404e',
	shadow: '#000',
	white: 'white'
};

const styles = StyleSheet.create({
	container: {
		gap: 8,
		marginVertical: 4,
		alignSelf: 'stretch',
		margin: 20
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: colors.white,
		borderRadius: 12,
		padding: 8,
		elevation: 3,
		shadowColor: colors.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	},
	addButtonWrapper: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	addButton: {
		marginTop: 20,
		transform: [{rotate: '135deg'}]
	},
	addLabel: {
		color: colors.dark,
		fontSize: 15
	}
});

const mapStateToProps = (state: any) => ({
	sequences: state.cycle_sequence.sequences
});

export default connect(mapStateToProps, {
	saveSequences,
	loadSequences,
	updateCycle
})(SeqSettingsSec);
