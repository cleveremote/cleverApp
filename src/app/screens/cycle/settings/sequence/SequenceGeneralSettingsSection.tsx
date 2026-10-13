import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {navigationHeader} from '../../../../components/common/navigationHeaders';
import {BoxFormStyle} from '../../../../styles/components/common/boxForm';
import {
	InputForm,
	TextAreaForm
} from '../../../../components/common/FormComponents';
import {connect} from 'react-redux';
import {useForm} from 'react-hook-form';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {hapticOptions} from '../../../../data/cycleTypes';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../../components/common/useSectionSettingsHeader';
import {updateSequence} from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SequenceGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.sequenceData
		: props.route.params?.sequenceData;
	const parentRef = React.useRef(props.sequenceData);
	parentRef.current = props.sequenceData;

	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const isSavingRef = React.useRef(false);
	const defaultValues = {...source};
	const {
		control,
		handleSubmit,
		watch,
		getValues,
		trigger,
		formState: {errors}
	} = useForm({defaultValues, mode: 'onChange'});

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data =>
			props.updateSequence({
				...parentRef.current,
				name: data.name,
				description: data.description,
				isModified: true
			})
	});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateSequence({...data, isModified: saveUnchangedData});
		}
	};

	const onSubmitGoBack = (data: any) => {
		ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		onSubmit(data);
		props.navigation.goBack();
	};

	useEffect(() => {
		if (embedded) return;
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
		if (embedded) return;
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

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={25}
					placeholder="Name*"
					rules={{required: 'Name is required'}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder="Description"
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
		</Body>
	);
}

export default connect(null, {
	updateSequence
})(SequenceGeneralSettingsSection);
