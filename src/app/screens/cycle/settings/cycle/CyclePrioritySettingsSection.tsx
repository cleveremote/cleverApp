import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {DragableForm} from '../../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';

export function PrioritySettingsSection(props: any) {
	// Mode embarqué : rendu inline dans l'écran de réglages du cycle. Les données
	// viennent de `props.cycleData` et les changements sont poussés en direct dans
	// le cycle parent (merge pour ne pas écraser sequences/conditions).
	const embedded = !!props.embedded;
	const source = embedded ? props.cycleData : props.route.params?.cycleData;
	const cycleDataRef = useRef(props.cycleData);
	cycleDataRef.current = props.cycleData;

	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const defaultValues = {...source};
	const {
		control,
		handleSubmit,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onChange'});

	// Section marquée « not valid » par l'écran parent : affiche les champs en
	// erreur (comme les conditions).
	useEffect(() => {
		if (embedded && props.showErrors) trigger();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.showErrors]);

	useEffect(() => {
		if (!embedded) return;
		const sub = watch(() => {
			const data = getValues();
			if (!data.modePriority) return;
			const priorities = data.modePriority.map(
				(x: any, index: number) => ({mode: x.mode, priority: index})
			);
			props.updateCycle({
				...cycleDataRef.current,
				modePriority: priorities,
				isModified: true
			});
		});
		return () => sub.unsubscribe();
	}, [embedded]);

	const onSubmit = (e: any, data: any) => {
		if (!saveUnchangedData) {
			// Aucune modification : on laisse la navigation se poursuivre.
			props.navigation.dispatch(e.data.action);
			return;
		}
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
	};

	useEffect(() => {
		if (embedded) return;
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
					scrollEnabled={!embedded}
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
