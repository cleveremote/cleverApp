import React, {useEffect} from 'react';
import {View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {DragableForm} from '../../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {connect} from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {updateCycle} from '../../../../../module/process/infrasctructure/store/actions/cycle';

export function PrioritySettingsSection(props: any) {
	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const isSavingRef = React.useRef(false);
	const defaultValues = {...props.route.params?.cycleData};
	const {
		control,
		handleSubmit,
		formState: {errors}
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			const priorities = data.modePriority.map(
				(x: any, index: number) => ({mode: x.mode, priority: index})
			);
			props.updateCycle({
				...data,
				modePriority: priorities,
				isModified: saveUnchangedData
			});
		}
	};

	const onSubmitGoBack = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		onSubmit(data);
		props.navigation.goBack();
	};

	useEffect(() => {
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					handleSubmit(onSubmitGoBack),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [saveUnchangedData]);

	useEffect(() => {
		const listenerUnsubscribe = props.navigation.addListener(
			'beforeRemove',
			(e: any) => {
				if (isSavingRef.current) return;
				e.preventDefault();
				isSavingRef.current = true;
				handleSubmit(data => {
					onSubmit(data);
					props.navigation.dispatch(e.data.action);
				})();
			}
		);
		return () => listenerUnsubscribe();
	}, [saveUnchangedData]);

	return (
		<View
			style={{
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
