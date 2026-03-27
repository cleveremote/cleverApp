import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {DragableForm} from '../../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';

export function PrioritySettingsSection(props: any) {
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const defaultValues = {...props.route.params?.cycleData};
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (e: any, data: any) => {
		if (saveUnchangedData) {
			const priorities = data.modePriority.map(
				(x: any, index: number) => ({mode: x.mode, priority: index})
			);
			props.updateCycle(
				{
					...data,
					modePriority: priorities,
					isModified: saveUnchangedData
				},
				() => {
					props.navigation.dispatch(e.data.action);
				}
			);
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
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				e.preventDefault();
				handleSubmit(data => {
					onSubmit(e, data);
				})();
			}
		);
		return () => listenerUnsubscribe();
	}, [saveUnchangedData]);

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<DragableForm
					control={control}
					errors={errors}
					name="modePriority"
					rules={{required: 'Mode priority is required'}}
					onDragEnd={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</View>
	);
}

export default connect(null, {
	updateCycle
})(PrioritySettingsSection);

const colors = {
	white: '#ffffff',
	shadow: '#000000'
};

const styles = StyleSheet.create({
	container: {
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
	}
});
