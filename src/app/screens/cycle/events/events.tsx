import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Platform, Text, View} from 'react-native';
import {connect} from 'react-redux';
import Spinner from 'react-native-loading-spinner-overlay';
import {loadValues} from '../../../../module/process/infrasctructure/store/actions/cycle';
import {styles} from '../../../styles/cycleStyles';
import {DateTimePickerForm} from '../../../components/common/FormComponents';
import {useForm} from 'react-hook-form';
import {BoxFormStyle} from '../../../styles/components/common/boxForm';
import {navigationHeader} from '../../../components/common/navigationHeaders';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const hapticOptions = {
	enableVibrateFallback: false,
	ignoreAndroidSystemSettings: true
};

const hapticTriggerType: string = Platform.select({
	ios: 'notificationSuccess',
	android: 'impactMedium'
}) as string;

function EventsScreen(props: any) {
	const getTimeString = (dateValue: number) => {
		const date = new Date();
		date.setHours(0, 0, 0, 0);
		return new Date(date.getTime() + dateValue);
	};
	const defaultValues = {startDate: getTimeString(0), endDate: new Date()};
	const [maximumDate, setMaximumDate] = useState(new Date());
	const [minimumDate, setMinimumDate] = useState(getTimeString(0));

	const {
		control,
		handleSubmit,
		formState: {errors},
		setValue,
		register
	} = useForm({defaultValues});

	const onSubmit = (data: any) => {
		props.loadValues('DATA', {
			startDate: data.startDate,
			endDate: data.endDate,
			deviceId: props.route.params.cycle.id
		});
	};

	const [refreshing, setRefreshing] = useState<boolean>(false);
	const onRefresh = async () => {
		setRefreshing(true);
		handleSubmit(onSubmit)();
		setRefreshing(false);
	};
	useEffect(() => {}, [props.data]);

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
		handleSubmit(onSubmit)();
	}, []);

	const renderItem = useCallback(({item}: {item: any}) => {
		const date = new Date(item.date);
		return (
			<View key={item.key} style={{marginVertical: 4}}>
				<View
					style={{
						alignSelf: 'stretch',
						backgroundColor: 'white',
						borderRadius: 12,
						elevation: 3,
						shadowColor: '#000',
						shadowOffset: {width: 0, height: 1},
						shadowOpacity: 0.22,
						shadowRadius: 2.22,
						height: 45,
						marginHorizontal: 4
					}}>
					<View
						style={{
							flexDirection: 'row',
							marginTop: 4,
							marginHorizontal: 8
						}}>
						<View
							style={{
								flex: 2,
								alignItems: 'flex-start',
								zIndex: 99
							}}>
							<View style={{flexDirection: 'row'}}>
								<Text
									style={{
										flex: 2,
										marginTop: 4,
										marginLeft: 8,
										fontWeight: 'bold',
										color: 'black',
										fontSize: 15
									}}
									numberOfLines={1}
									ellipsizeMode="middle">
									{date.getDate() +
										'-' +
										(date.getMonth() + 1) +
										'-' +
										date.getFullYear() +
										' ' +
										date.getHours() +
										':' +
										date.getMinutes() +
										':' +
										date.getSeconds()}{' '}
									: {item.type} SWITCH {item.value}
								</Text>
							</View>
						</View>
					</View>
				</View>
			</View>
		);
	}, []);

	return (
		<View style={{gap: 8, marginVertical: 4, alignSelf: 'stretch'}}>
			<View style={BoxFormStyle.boxForm}>
				<DateTimePickerForm
					mode={'datetime'}
					control={control}
					errors={errors}
					name="startDate"
					placeholder="Get logs from :"
					rules={{required: 'start date is required'}}
					maximumDate={maximumDate}
					onChangeText={(value: any) => {
						const now = new Date();
						setMaximumDate(now);
						setMinimumDate(value);
						setTimeout(() => {
							handleSubmit(onSubmit)();
						}, 200);
					}}
				/>
				<DateTimePickerForm
					mode={'datetime'}
					control={control}
					errors={errors}
					name="endDate"
					placeholder="to :"
					rules={{required: 'end date is required'}}
					minimumDate={minimumDate}
					maximumDate={maximumDate}
					onChangeText={(value: any) => {
						setTimeout(() => {
							handleSubmit(onSubmit)();
						}, 200);
					}}
				/>
			</View>
			<Spinner
				visible={props.isLoading}
				color="#32404e"
				textStyle={styles.spinnerTextStyle}
				animation="fade"
			/>
			<FlatList
				data={props.data}
				renderItem={renderItem}
				keyExtractor={item => item.id}
				onRefresh={() => onRefresh()}
				refreshing={refreshing}
			/>
		</View>
	);
}

const mapStateToProps = (state: any) => ({
	data: state.root_cycle.data
});

export default connect(mapStateToProps, {
	loadValues
})(EventsScreen);
