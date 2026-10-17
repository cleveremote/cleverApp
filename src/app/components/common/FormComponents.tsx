import React, {useState} from 'react';
import {Control, Controller, FieldErrors} from 'react-hook-form';
import {getColors} from '../../data/cycleTypes';
import {InputStyle, placeholderColor} from '../../styles/components/common/Input';
import {
	FlatList,
	Keyboard,
	KeyboardTypeOptions,
	Modal,
	Pressable,
	Text,
	TextInput,
	View
} from 'react-native';
import {AppSwitch} from './AppSwitch';
import {DragableSequences} from './draggableStack';
import {styles} from '../../styles/cycleStyles';
import {SequenceStack} from '../cycle/sequenceStack';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {
	faBan,
	faCog,
	faChevronDown,
	faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';
import Slider from '@react-native-community/slider';

// Resolve a field error by name, supporting dotted paths (e.g.
// `config.ipAddress`, `params.persistence.address`). react-hook-form nests its
// error tree, so `errors['config.ipAddress']` is always undefined — walk the
// path instead so nested fields show their inline error like flat ones.
const getFieldError = (errors: FieldErrors<any>, name: string): any =>
	name
		.split('.')
		.reduce(
			(acc: any, key: string) => (acc == null ? acc : acc[key]),
			errors as any
		);

export function DropdownSelect<T extends {iconColor?: {base: string}}>({
	items,
	value,
	getLabel,
	getValue,
	renderPrefix,
	onChange,
	hasError,
	disabled = false
}: Readonly<{
	items: T[];
	value: any;
	getLabel: (item: T) => string;
	getValue: (item: T) => any;
	renderPrefix?: (item: T) => React.ReactNode;
	onChange: (value: any) => void;
	hasError: boolean;
	disabled?: boolean;
}>) {
	const [isOpen, setIsOpen] = useState(false);
	const selectedItem = items.find(item => {
		return String(getValue(item)) === String(value);
	});
	const label = selectedItem ? getLabel(selectedItem) : '—';

	return (
		<>
			<Pressable
				disabled={disabled}
				onPress={() => setIsOpen(true)}
				style={[
					InputStyle.input,
					{
						borderRadius: 12,
						borderWidth: hasError ? 2 : 1,
						borderColor: hasError ? '#FC8181' : '#CBD5E0',
						paddingHorizontal: 12,
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginVertical: 4,
						opacity: disabled ? 0.6 : 1,
						backgroundColor:
							selectedItem?.iconColor?.base ?? 'transparent'
					}
				]}>
				<View
					style={{
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8
					}}>
					{selectedItem && renderPrefix
						? renderPrefix(selectedItem)
						: null}
					<Text
						style={{
							color: '#32404e',
							fontSize: 15,
							fontWeight: 'bold'
						}}>
						{label}
					</Text>
				</View>
				{disabled ? null : (
					<FontAwesomeIcon
						icon={faChevronDown}
						size={12}
						color="#32404e"
					/>
				)}
			</Pressable>
			<Modal visible={isOpen} transparent animationType="fade">
				<Pressable
					style={{
						flex: 1,
						backgroundColor: 'rgba(0,0,0,0.4)',
						justifyContent: 'flex-end'
					}}
					onPress={() => setIsOpen(false)}>
					<View
						onStartShouldSetResponder={() => true}
						style={{
							backgroundColor: 'white',
							borderTopLeftRadius: 16,
							borderTopRightRadius: 16,
							maxHeight: 320
						}}>
						<FlatList
							data={items}
							keyExtractor={(_, i) => 'opt_' + i}
							renderItem={({item}) => (
								<Pressable
									onPress={() => {
										onChange(getValue(item));
										setIsOpen(false);
									}}
									style={{
										padding: 16,
										borderBottomWidth: 1,
										borderBottomColor: '#E2E8F0',
										flexDirection: 'row',
										alignItems: 'center',
										gap: 10
									}}>
									{renderPrefix ? renderPrefix(item) : null}
									<Text
										style={{
											color: '#32404e',
											fontSize: 15,
											fontWeight:
												String(getValue(item)) ===
												String(value)
													? 'bold'
													: 'normal'
										}}>
										{getLabel(item)}
									</Text>
								</Pressable>
							)}
						/>
					</View>
				</Pressable>
			</Modal>
		</>
	);
}

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
		if (
			!!dateValue &&
			!(dateValue instanceof Date && !isNaN(dateValue.getTime()))
		) {
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
					<View>
						<Text
							style={{
								...InputStyle.textInput,
								color: getFieldError(errors, name) ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<Pressable onPress={showDatePicker}>
							<TextInput
								style={[
									InputStyle.input,
									{
										borderRadius: 12,
										borderWidth: 1,
										borderColor: '#CBD5E0',
										paddingHorizontal: 12
									}
								]}
								placeholder={placeholder}
								placeholderTextColor={placeholderColor}
								onBlur={onBlur}
								editable={false}
								value={
									mode === 'datetime'
										? mediumTime.format(
												!!value &&
													value instanceof Date &&
													!isNaN(value.getTime())
													? value
													: new Date()
										  )
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
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
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
					<View>
						<Text
							style={{
								...InputStyle.textInput,
								color: getFieldError(errors, name) ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<Slider
							style={InputStyle.input}
							onValueChange={value => {
								onChangeText(value);
								onChange(value);
							}}
							value={value}
							minimumValue={60}
							maximumValue={100}
							accessibilityLabel={placeholder}
							step={1}
						/>
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
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
	keyboardType,
	maxLength,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	refr?: any;
	keyboardType?: KeyboardTypeOptions;
	maxLength?: number;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<View>
						<Text
							style={{
								...InputStyle.textInput,
								color: getFieldError(errors, name) ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<TextInput
							style={[
								InputStyle.input,
								{
									borderRadius: 12,
									borderWidth: getFieldError(errors, name) ? 2 : 1,
									borderColor: getFieldError(errors, name)
										? '#FC8181'
										: '#CBD5E0',
									paddingHorizontal: 12
								},
								disabled && InputStyle.inputDisabled
							]}
							placeholder={placeholder}
							placeholderTextColor={placeholderColor}
							onBlur={onBlur}
							editable={!disabled}
							keyboardType={keyboardType}
							maxLength={maxLength}
							ref={refr}
							onChangeText={value => {
								onChangeText(value);
								onChange(value);
							}}
							value={value?.toString()}
						/>
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
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
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginVertical: 8
						}}>
						<Text
							style={{
								color: '#32404e',
								fontSize: 15,
								fontWeight: 'bold',
								flexShrink: 1,
								marginRight: 8
							}}>
							{placeholder}
						</Text>
						<AppSwitch
							value={value}
							onValueChange={checked => {
								onChangeText(checked);
								onChange(checked);
							}}
						/>
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
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
	colorProportion = 0,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	style: any;
	colorProportion?: number;
	onChangeText?: (value: any) => void;
}>) {
	return (
		<View>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange}}) => {
					const items = getColors(colorProportion);
					// Le style enregistré contient des champs supplémentaires (id)
					// et un ordre de clés différent : on retrouve l'entrée de la
					// palette via bgColor (identité stable) pour la présélection.
					const selected = items.find(
						color => color.bgColor === style?.bgColor
					);
					return (
					<View>
						<DropdownSelect
							items={items}
							value={selected ? JSON.stringify(selected) : ''}
							getLabel={color => color.bgColor || ''}
							getValue={color => JSON.stringify(color)}
							renderPrefix={color => (
								<View
									style={{
										width: '100%',
										height: '100%',
										backgroundColor: color.iconColor.icon
									}}
								/>
							)}
							onChange={val => {
								onChangeText(val);
								onChange(val);
							}}
							hasError={!!getFieldError(errors, name)}
						/>
					</View>
					);
				}}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
			)}
		</View>
	);
}

export function TextAreaForm({
	control,
	placeholder,
	name,
	errors,
	rules = {},
	disabled = false,
	maxLength = 500,
	onChangeText = () => {}
}: Readonly<{
	control: Control<any, any>;
	placeholder: string;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	disabled?: boolean;
	maxLength?: number;
	onChangeText?: (value: any) => void;
}>) {
	// Le champ s'adapte à son contenu : `scrollEnabled={false}` fait
	// s'auto-dimensionner un TextInput multiline (iOS comme Android), à
	// condition de ne pas lui imposer de hauteur — d'où le `height: 'auto'`
	// qui neutralise le `height: 50` de InputStyle.input, remplacé par un
	// simple minimum. La description est donc toujours affichée en entier,
	// sans scroll interne, et reste à une ligne quand le texte est court.
	const minHeight = 50;

	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<View>
						<Text
							style={{
								...InputStyle.textInput,
								color: getFieldError(errors, name) ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<TextInput
							multiline={true}
							scrollEnabled={false}
							maxLength={maxLength}
							style={[
								InputStyle.input,
								{
									borderRadius: 12,
									borderWidth: getFieldError(errors, name) ? 2 : 1,
									borderColor: getFieldError(errors, name)
										? '#FC8181'
										: '#CBD5E0',
									paddingHorizontal: 12,
									paddingTop: 14,
									paddingBottom: 14,
									height: 'auto',
									minHeight: minHeight,
									textAlignVertical: 'top'
								},
								disabled && InputStyle.inputDisabled
							]}
							placeholder={placeholder}
							placeholderTextColor={placeholderColor}
							onBlur={onBlur}
							editable={!disabled}
							onChangeText={value => {
								onChangeText(value);
								onChange(value);
							}}
							value={value}
							onSubmitEditing={Keyboard.dismiss}
						/>
						<Text
							style={{
								alignSelf: 'flex-end',
								color:
									(value?.length ?? 0) >= maxLength
										? '#FC8181'
										: placeholderColor,
								fontSize: 12,
								marginTop: 2
							}}>
							{(value?.length ?? 0) + '/' + maxLength}
						</Text>
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
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
	parentId,
	scrollEnabled = true
}: Readonly<{
	control: Control<any, any>;
	name: string;
	errors: FieldErrors<any>;
	rules?: any;
	onDragEnd?: (data: any[]) => void;
	isList?: boolean;
	navigation?: any;
	parentId?: string;
	scrollEnabled?: boolean;
}>) {
	return (
		<>
			<Controller
				control={control}
				rules={rules}
				render={({field: {onChange, onBlur, value}}) => (
					<View>
						<DragableSequences
							scrollEnabled={scrollEnabled}
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
									<View
										style={{
											alignSelf: 'stretch',
											backgroundColor: isActive
												? '#32404e'
												: 'white',
											borderRadius: 12,
											elevation: 3,
											shadowColor: '#000',
											shadowOffset: {width: 0, height: 1},
											shadowOpacity: 0.22,
											shadowRadius: 2.22,
											margin: 4
										}}>
										<View style={{flexDirection: 'row'}}>
											<Text
												style={[
													isActive
														? styles.textDrag
														: styles.text,
													{
														flex: 2,
														alignSelf: 'flex-start',
														margin: 8
													}
												]}>
												{item.mode}
											</Text>
											<Text
												style={[
													isActive
														? styles.textPriorityDrag
														: styles.textPriority,
													{
														alignSelf: 'flex-end',
														display:
															(value ?? []).findIndex(
																(x: any) =>
																	x.mode ===
																	item.mode
															) === 0
																? 'flex'
																: 'none',
														margin: 8
													}
												]}>
												higher
											</Text>
											<Text
												style={[
													isActive
														? styles.textPriorityDrag
														: styles.textPriority,
													{
														alignSelf: 'flex-end',
														display:
															(value ?? []).findIndex(
																(x: any) =>
																	x.mode ===
																	item.mode
															) === 4
																? 'flex'
																: 'none',
														margin: 8
													}
												]}>
												lowest
											</Text>
										</View>
									</View>
								);
							}}
							data={(value ?? []).filter((x: any) =>
								x.delete
									? false
									: x.id
									? x.id?.indexOf('delete') === -1
									: true
							)}
						/>
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
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
					<View>
						<Text
							style={{
								...InputStyle.textInput,
								color: getFieldError(errors, name) ? 'red' : '#32404e'
							}}>
							{placeholder}
						</Text>
						<DropdownSelect
							items={lstData}
							value={value}
							getLabel={item => `${item.label}`}
							getValue={item => `${item.value}`}
							disabled={disabled}
							onChange={val => {
								onChange(val);
								onValueChange(val);
							}}
							hasError={!!getFieldError(errors, name)}
						/>
					</View>
				)}
				name={name}
			/>
			{getFieldError(errors, name) && (
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<FontAwesomeIcon
						icon={faTriangleExclamation}
						style={InputStyle.iconInputError}
					/>
					<Text style={InputStyle.textInputError}>
						{(getFieldError(errors, name)?.message as string) || 'unknown error'}
					</Text>
				</View>
			)}
		</>
	);
}
