import React, {useEffect} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {
	InputForm,
	SelectColor,
	TextAreaForm
} from '../../../components/common/FormComponents';
import {connect} from 'react-redux';
import {
	useValidateOnOpen,
	useEmbeddedSection
} from '../../../components/common/useSectionSettingsHeader';
import {updateSensor} from '../../../../module/process/infrasctructure/store/actions/sensor';
import i18n from 'i18next';

export function SensorGeneralSettingsSection(props: any) {
	const embedded = !!props.embedded;
	const source = embedded ? props.sensorData : props.route.params?.sensorData;
	const parentRef = React.useRef(props.sensorData);
	parentRef.current = props.sensorData;

	const [sensorData, setSensorData] = React.useState(source);
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

	useValidateOnOpen(props.route, trigger);

	useEmbeddedSection({
		embedded,
		showErrors: props.showErrors,
		trigger,
		watch,
		getValues,
		stage: data => {
			let style = data.style;
			if (typeof style === 'string') style = JSON.parse(style);
			props.updateSensor({
				...parentRef.current,
				style: style
					? {
							fontColor: style.fontColor,
							iconColor: style.iconColor,
							bgColor: style.bgColor
					  }
					: parentRef.current?.style,
				name: data.name,
				description: data.description,
				isModified: true
			});
		}
	});

	const onSubmit = (data: any) => {
		let style = data.style;
		if (typeof style === 'string') {
			style = JSON.parse(style);
		}
		props.updateSensor({
			...source,
			...data,
			style: {
				fontColor: style.fontColor,
				iconColor: style.iconColor,
				bgColor: style.bgColor
			},
			isModified: saveUnchangedData
		});
		props.navigation.goBack();
	};

	useEffect(() => {
		if (embedded) return;
		props.navigation.setOptions({
			headerLeft: () =>
				navigationHeader(
					handleSubmit(onSubmit),
					'arrow-alt-circle-left',
					false
				)
		});
	}, [saveUnchangedData]);

	const Body: any = embedded ? View : ScrollView;
	const bodyProps: any = embedded
		? {}
		: {automaticallyAdjustKeyboardInsets: true};
	return (
		<View style={BoxFormStyle.boxForm}>
			<Text
				style={{
					color: '#32404e',
					fontSize: 15,
					fontWeight: 'bold',
					marginTop: 5,
					marginBottom: 5
				}}>
				{i18n.t('cycle:settings.theme')}
			</Text>
			<SelectColor
				control={control}
				errors={errors}
				name="style"
				placeholder={i18n.t('sensor:theme')}
				rules={{required: i18n.t('cycle:settings.themeRequired')}}
				style={{...sensorData?.style}}
				onChangeText={value => {
					setSensorData({...sensorData, style: JSON.parse(value)});
					setSaveUnchangedData(true);
				}}
			/>
			<Body {...bodyProps}>
				<InputForm
					control={control}
					errors={errors}
					name="name"
					maxLength={250}
					placeholder={i18n.t('common:form.name')}
					rules={{required: i18n.t('common:form.nameRequired')}}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
				<TextAreaForm
					control={control}
					errors={errors}
					name="description"
					placeholder={i18n.t('common:form.description')}
					onChangeText={value => {
						setSaveUnchangedData(true);
					}}
				/>
			</Body>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	sensors: state.root_sensor.sensors
});

export default connect(mapStateToProps, {
	updateSensor
})(SensorGeneralSettingsSection);
