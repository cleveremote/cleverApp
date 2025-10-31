import {
	Box,
	CheckIcon,
	Flex,
	HStack,
	Input,
	Select,
	Slider,
	Switch,
	Text,
	TextArea,
	VStack
} from 'native-base';
import {Control, Controller, FieldErrors} from 'react-hook-form';
import {getColors} from '../../data/cycleTypes';
import {InputStyle} from '../../styles/components/common/Input';
import {Keyboard, Platform, Pressable} from 'react-native';
import {DragableSequences} from './draggableStack';
import {styles} from '../../styles/cycleStyles';
import {SequenceStack} from '../cycle/sequenceStack';
import React from 'react';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faBan,
	faCog,
	faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';

export function DateTimePickerForm({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	mode,
	onChangeText = () => {},
	maximumDate,
	minimumDate
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	mode: string;
	onChangeText?: (value: any) => void;
	maximumDate?: Date;
	minimumDate?: Date;
}>) {
	const [isDatePickerVisible, setDatePickerVisibility] =
		React.useState(false);

	const showDatePicker = () => {
		setDatePickerVisibility(true);
	};

	const hideDatePicker = () => {
		setDatePickerVisibility(false);
	};

	const getTimeString = (dateValue: Date) => {
		if (!(dateValue instanceof Date && !isNaN(dateValue.getTime()))) {
			dateValue = new Date();
			dateValue.setHours(0, 0, 0, 0);
		}
		const h = dateValue.getHours();
		const m = dateValue.getMinutes();
		const hours = h < 10 ? `0${h}` : `${h}`;
		const minutes = m < 10 ? `0${m}` : `${m}`;
		return `${hours}:${minutes}`;
	};

	const mediumTime = new Intl.DateTimeFormat('en', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		hourCycle: 'h23'
	});

	const setCurrentTime = (value: any, mode: string) => {
		if (value instanceof Date && !isNaN(value.getTime())) {
			if (mode === 'datetime') {
				return new Date(value);
			} else {
				return value;
			}
		} else {
			if (mode === 'datetime') {
				return new Date();
			} else {
				const d = new Date();
				d.setHours(0, 0, 0, 0);
				return d;
			}
		}
	};

	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<Text
							style={{
								...InputStyle.textInput,
								color: errors[name] ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<Pressable onPress={showDatePicker}>
							<Input
								rounded="xl"
								style={InputStyle.input}
								placeholder={placeholder}
								onBlur={onBlur}
								editable={false}
								value={
									mode === 'datetime'
										? mediumTime.format(value)
										: getTimeString(value)
								}
								pointerEvents="none"
							/>
						</Pressable>

						<DateTimePickerModal
							maximumDate={maximumDate}
							minimumDate={minimumDate}
							isDarkModeEnabled={false}
							themeVariant="light"
							display={mode === 'datetime' ? 'inline' : 'spinner'}
							isVisible={isDatePickerVisible}
							mode={mode === 'datetime' ? 'datetime' : 'time'}
							date={setCurrentTime(value, mode)}
							onConfirm={date => {
								onChangeText(date);
								onChange(date);
								hideDatePicker();
							}}
							onCancel={hideDatePicker}
						/>
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}

export function SliderForm({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	refr,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	refr?: any;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<Text
							style={{
								...InputStyle.textInput,
								color: errors[name] ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<Slider
							style={InputStyle.input}
							borderColor={errors[name] && 'red.500'}
							borderWidth={errors[name] && 2}
							onChange={value => {
								onChangeText(value);
								onChange(value);
							}}
							value={value}
							minValue={0}
							maxValue={100}
							accessibilityLabel={placeholder}
							step={10}>
							<Slider.Track>
								<Slider.FilledTrack />
							</Slider.Track>
							<Slider.Thumb />
						</Slider>

						{/* <Input rounded="xl"
                            style={InputStyle.input}
                            borderColor={errors[name] && "red.500"} borderWidth={errors[name] && 2}
                            placeholder={placeholder}
                            onBlur={onBlur}
                            isDisabled={disabled}
                            ref={refr}
                            onChangeText={value => {
                                onChangeText(value);
                                onChange(value);
                            }}
                            value={value?.toString()} /> */}
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}

export function InputForm({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	refr,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	refr?: any;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<Text
							style={{
								...InputStyle.textInput,
								color: errors[name] ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<Input
							rounded="xl"
							style={InputStyle.input}
							borderColor={errors[name] && 'red.500'}
							borderWidth={errors[name] && 2}
							placeholder={placeholder}
							onBlur={onBlur}
							isDisabled={disabled}
							ref={refr}
							onChangeText={value => {
								onChangeText(value);
								onChange(value);
							}}
							value={value?.toString()}
						/>
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}

export function SwitchForm({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<HStack>
						<Switch
							mt={2}
							isChecked={value}
							onTrackColor={'#32404e'}
							offThumbColor={'blueGray.50'}
							size={'md'}
							onValueChange={checked => {
								onChangeText(checked);
								onChange(checked);
							}}
							style={{
								...(Platform.OS === 'android' && {
									transform: [{scaleX: 1.5}, {scaleY: 1.5}],
									marginVertical: 10
								})
							}}
						/>
						<Text
							mt={3}
							style={{
								color: '#32404e',
								fontSize: 15,
								marginLeft: 5,
								fontWeight: 'bold'
							}}>
							{placeholder}
						</Text>
					</HStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}

export function SelectColor({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	style,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	style: any;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<Box>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<Select
							style={InputStyle.input}
							rounded={'xl'}
							borderColor={errors[name] && 'red.500'}
							borderWidth={errors[name] && 2}
							key={0}
							placeholder={placeholder}
							placeholderTextColor="#32404e"
							bgColor={style?.fontColor}
							_selectedItem={{
								bg: style?.fontColor,
								endIcon: <CheckIcon size="5" />
							}}
							selectedValue={JSON.stringify(style)}
							onValueChange={value => {
								onChangeText(value);
								onChange(value);
							}}>
							{getColors().map((color, index) => (
								<Select.Item
									label={''}
									value={JSON.stringify(color)}
									bgColor={color.bgColor}
									key={'item_' + index}
								/>
							))}
						</Select>
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</Box>
	);
}

export function TextAreaForm({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<Text
							style={{
								...InputStyle.textInput,
								color: errors[name] ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<TextArea
							borderColor={errors[name] && 'red.500'}
							borderWidth={errors[name] && 2}
							rounded="xl"
							style={InputStyle.input}
							placeholder={placeholder}
							onBlur={onBlur}
							isDisabled={disabled}
							onChangeText={value => {
								onChangeText(value);
								onChange(value);
							}}
							value={value}
							autoCompleteType={undefined}
							onSubmitEditing={Keyboard.dismiss}
						/>
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}

export function DragableForm({
	control,
	name,
	errors,
	rules = {},
	onDragEnd = (data: any[]) => {},
	isList = false,
	navigation,
	parentId
}: Readonly<{
	control: Control<any, any>;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	onDragEnd?: (data: any[]) => void;
	isList?: boolean;
	navigation?: any;
	parentId?: string;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<DragableSequences
							onDrag={() => {}}
							onDragEnd={(value: any[]) => {
								onChange(value);
								onDragEnd(value);
							}}
							stackElement={(item: any, isActive: boolean) => {
								return isList ? (
									<SequenceStack
										navigation={navigation}
										cycleId={parentId || ''}
										item={item}
										isActive={isActive}
										onSkip={() => {}}
									/>
								) : (
									<Box
										alignSelf="stretch"
										bg={isActive ? '#32404e' : 'white'}
										rounded="xl"
										shadow={3}
										m={1}>
										<Flex direction="row">
											<Text
												flex={2}
												alignSelf={'flex-start'}
												style={
													isActive
														? styles.textDrag
														: styles.text
												}
												m={2}>
												{item.mode}
											</Text>
											<Text
												alignSelf={'flex-end'}
												display={
													value.findIndex(
														(x: any) =>
															x.mode === item.mode
													) === 0
														? 'flex'
														: 'none'
												}
												style={
													isActive
														? styles.textPriorityDrag
														: styles.textPriority
												}
												m={2}>
												higher
											</Text>
											<Text
												alignSelf={'flex-end'}
												display={
													value.findIndex(
														(x: any) =>
															x.mode === item.mode
													) === 2
														? 'flex'
														: 'none'
												}
												style={
													isActive
														? styles.textPriorityDrag
														: styles.textPriority
												}
												m={2}>
												lowest
											</Text>
										</Flex>
									</Box>
								);
							}}
							data={value.filter((x: any) =>
								x.id ? x.id?.indexOf('delete') === -1 : true
							)}
						/>
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}

export function SelectForm({
	lstData,
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	onValueChange = () => {}
}: Readonly<{
	lstData: any[];
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	onValueChange?: (value: any) => void;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<VStack>
						<Text
							style={{
								...InputStyle.textInput,
								color: errors[name] ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<Select
							defaultValue={value}
							_actionSheetContent={{maxHeight: '2xl'}}
							placeholder={placeholder}
							borderColor={errors[name] && 'red.500'}
							borderWidth={errors[name] && 2}
							rounded="xl"
							fontSize={15}
							fontWeight={'bold'}
							height={'50px'}
							_selectedItem={{
								bg: 'blue.400',
								endIcon: <CheckIcon size="5" />
							}}
							my={1}
							onValueChange={value => {
								onChange(value);
								onValueChange(value);
							}}>
							{lstData.map((item, index) => (
								<Select.Item
									key={'action_' + index}
									label={`${item.label}`}
									value={`${item.value}`}
								/>
							))}
						</Select>
					</VStack>
				)}
				name={name}
			/>
			{errors[name] && (
				<HStack>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(errors[name]?.message as string) || 'unknown error'}
					</Text>
				</HStack>
			)}
		</>
	);
}
