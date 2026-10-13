import React, { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { navigationHeader } from '../../../../components/common/navigationHeaders';
import { useForm } from 'react-hook-form';
import {
	DateTimePickerForm,
	SelectForm,
	SliderForm
} from '../../../../components/common/FormComponents';
import { BoxFormStyle } from '../../../../styles/components/common/boxForm';
import { connect } from 'react-redux';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { hapticOptions } from '../../../../data/cycleTypes';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../../components/common/useSectionSettingsHeader';
import { updateSequence } from '../../../../../module/process/infrasctructure/store/actions/sequence';

export function SequenceSecuritySettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded
		? props.sequenceData
		: props.route.params?.sequenceData;
	const parentRef = React.useRef(props.sequenceData);
	parentRef.current = props.sequenceData;

	const [saveUnchangedData, setSaveUnchangedData] = React.useState(false);
	const isSavingRef = React.useRef(false);

	const getTimeString = (dateValue: number) => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return new Date(date.getTime() + (dateValue || 0));
	};
	const convertToMs = (t: Date) =>
		t.getHours() * 60 * 60 * 1000 + t.getMinutes() * 60 * 1000;

	const defaultValues = {
		...source,
		securityConfig: {
			...source?.securityConfig,
			maxDuration: getTimeString(source?.securityConfig?.maxDuration)
		}
	};
	const [vfd, setVfd] = React.useState(defaultValues.vfd);
	const {
		control,
		handleSubmit,
		watch,
		getValues,
		trigger,
		formState: { errors }
	} = useForm({ defaultValues, mode: 'onChange' });

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
				securityConfig: {
					maxDuration: convertToMs(data.securityConfig?.maxDuration)
				},
				isModified: true
			})
	});

	const onSubmit = (data: any) => {
		if (saveUnchangedData) {
			props.updateSequence({
				...data,
				securityConfig: {
					maxDuration: convertToMs(data.securityConfig.maxDuration)
				},
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

	const getModbusTasks = () => {
		return props.modbusTasks.map((x: any) => ({
			label: x.label,
			value: x.id
		}));
	};

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: { automaticallyAdjustKeyboardInsets: true };

	return (
		<Body {...bodyProps}>
			<View style={BoxFormStyle.boxForm}>
				<DateTimePickerForm
					mode={'time'}
					control={control}
					errors={errors}
					name="securityConfig.maxDuration"
					placeholder="security*"
					rules={{ required: 'Security is required' }}
					onChangeText={() => {
						setSaveUnchangedData(true);
					}}
				/>
			</View>
			{/* <View style={BoxFormStyle.boxForm}>
				<SelectForm
					lstData={getModbusTasks()}
					control={control}
					errors={errors}
					name="taskId"
					placeholder="tasks"
					rules={{ required: false }}
					onValueChange={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<SliderForm
					control={control}
					errors={errors}
					name="vfd"
					placeholder={`VFD speed* → ${vfd} %`}
					rules={{ required: 'VFD speed is required' }}
					onChangeText={value => {
						setSaveUnchangedData(true);
						setVfd(value);
					}}
				/>
			</View> */}
		</Body>
	);
}

const mapStateToProps = (state: any) => ({
	modbusTasks: state.root_modbus_task.modbusTasks
});

export default connect(mapStateToProps, {
	updateSequence
})(SequenceSecuritySettingsSection);
