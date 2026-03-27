import React, {useEffect, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import {connect} from 'react-redux';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {
	DeleteItemMenu,
	MenuAccordion
} from '../../../../components/common/cycleMenu';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
	faGear,
	faRotateRight,
	faTrafficLight
} from '@fortawesome/free-solid-svg-icons';
import {hapticOptions} from '../../../../data/cycleTypes';
import {Alert} from 'react-native';
import {
	loadCycle,
	saveCycle
} from '../../../../../module/process/infrasctructure/store/actions/cycle';
import {CycleType} from '../../../../data/cycleTypes';
import {NavigationAction} from '@react-navigation/native';

type BeforeRemoveEvent = {
	preventDefault: () => void;
	data: {action: NavigationAction};
};

export function CycleSett(props: any) {
	const cycleRef = useRef(props.cycle);
	cycleRef.current = props.cycle;

	const handleBeforeRemove = (
		e: BeforeRemoveEvent,
		ref: React.MutableRefObject<CycleType>,
		onSave: () => void,
		onDiscard: () => void
	) => {
		const hasModified =
			ref.current?.isModified ||
			ref.current?.sequences?.some(x => !!x.isModified);
		if (!hasModified) return;

		const backActions = ['GO_BACK', 'POP', 'POP_TO_TOP'];
		if (!backActions.includes(e.data.action.type)) {
			return;
		}
		e.preventDefault();
		Alert.alert(
			'Discard changes?',
			'You have unsaved changes. Are you sure to discard them and leave the screen?',
			[
				{
					text: 'save',
					style: 'cancel',
					onPress: () => {
						onSave();
					}
				},
				{
					text: 'Discard',
					style: 'destructive',
					onPress: () => {
						onDiscard();
					}
				}
			]
		);
	};

	const _deleteItem = () => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		cycleRef.current = {
			...cycleRef.current,
			id: `deleted_${props.cycle.id}`,
			isModified: true
		};
		props.navigation.goBack();
	};

	useEffect(() => {
		props.loadCycle(props.route.params?.id);
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
				handleBeforeRemove(
					e,
					cycleRef,
					() => {
						props.saveCycle(cycleRef.current, false, () => {
							props.navigation.dispatch(e.data.action);
						});
					},
					() => {
						props.navigation.dispatch(e.data.action);
					}
				);
			}
		);

		return () => listenerUnsubscribe();
	}, [props.cycle]);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<MenuAccordion
					key={21}
					name={'General'}
					icon={faGear}
					onPress={() => {
						props.navigation.navigate('CycleGeneralSection', {
							cycleData: props.cycle
						});
					}}
				/>
				<MenuAccordion
					key={41}
					name={'Priority'}
					icon={faTrafficLight}
					onPress={() => {
						props.navigation.navigate('CyclePrioritySection', {
							cycleData: props.cycle
						});
					}}
				/>
				<MenuAccordion
					key={51}
					name={'Sequences'}
					icon={faRotateRight}
					onPress={() => {
						props.navigation.navigate('CycleSequenceSection', {
							cycleData: props.cycle
						});
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
	);
}

const colors = {
	white: 'white',
	shadow: '#000'
};

const styles = StyleSheet.create({
	container: {
		alignSelf: 'stretch'
	},
	card: {
		alignSelf: 'stretch',
		backgroundColor: colors.white,
		marginTop: 8,
		marginHorizontal: 20,
		borderRadius: 12,
		elevation: 3,
		shadowColor: colors.shadow,
		shadowOffset: {width: 0, height: 1},
		shadowOpacity: 0.22,
		shadowRadius: 2.22
	}
});

const mapStateToProps = (state: any) => ({
	cycle: state.root_cycle.cycle
});

export default connect(mapStateToProps, {
	loadCycle,
	saveCycle
})(CycleSett);
