import {ELEMENT_HEIGHT} from '../../styles/metrics';
import React from 'react';
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {IconDefinition, faCog} from '@fortawesome/free-solid-svg-icons';
import {styles} from '../../styles/cycleStyles';
import {
	InputStyle,
	inputText,
	placeholderColor,
	stackLabelText
} from '../../styles/components/common/Input';
import {hapticOptions} from '../../data/cycleTypes';

// When `numericInput` is provided (devices of a task cycle), the row also
// renders a numeric field facing the label so the user can enter a value for
// the element. When `settingsAction` is provided (CTRL actuators), a gear icon
// is rendered before the main action so the row can open a dedicated config.
// A null `icon` hides the main action; `numericInput.disabled` greys the field
// out as read-only. `badge` is rendered before the label (e.g. a device's
// connectivity dot). `warning` outlines the row in orange and shows its text
// under the label (e.g. an unreachable device). The label uses the shared
// stack text style (stackLabelText, Input.tsx).
const WARNING_BORDER = '#fdba74';

export function elementStack(
	item: any,
	actionElement: Function,
	label: string,
	icon: {name: IconDefinition; color: string} | null,
	numericInput?: {
		value: any;
		onChangeValue: (text: string) => void;
		placeholder?: string;
		disabled?: boolean;
	},
	settingsAction?: () => void,
	badge?: React.ReactNode,
	warning?: string
) {
	return (
		<View
			style={{
				alignSelf: 'stretch',
				backgroundColor: 'white',
				borderWidth: warning ? 2 : 0,
				borderColor: WARNING_BORDER,
				borderRadius: 12,
				margin: 4,
				minHeight: ELEMENT_HEIGHT,
				justifyContent: 'center',
				elevation: 3,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 1},
				shadowOpacity: 0.22,
				shadowRadius: 2.22
			}}
			key={item.id}>
			<View style={{flexDirection: 'row', alignItems: 'center'}}>
				{badge ? <View style={{marginLeft: 10}}>{badge}</View> : null}
				<View style={{flex: 1, marginVertical: 8, marginLeft: 8}}>
					{/* 'left' = côté de début : RN l'inverse en RTL, alors que 'auto'
					    suit le contenu et laisse un libellé latin à gauche en arabe. */}
					<Text
						style={[localStyles.label, {textAlign: 'left'}]}>
						{label}
					</Text>
					{warning ? (
						<Text
							style={{color: '#6b7280', fontSize: 11, textAlign: 'left'}}
							numberOfLines={2}>
							{warning}
						</Text>
					) : null}
				</View>
				{numericInput ? (
					<TextInput
						keyboardType="numeric"
						value={
							numericInput.value !== undefined &&
							numericInput.value !== null
								? `${numericInput.value}`
								: ''
						}
						onChangeText={numericInput.onChangeValue}
						editable={!numericInput.disabled}
						placeholder={numericInput.placeholder ?? '0'}
						placeholderTextColor={placeholderColor}
						style={[
							{
								minWidth: 70, //ZJzzA6Di
								marginVertical: 6,
								marginRight: 8,
								paddingVertical: 4,
								paddingHorizontal: 8,
								borderWidth: 1,
								borderColor: '#CBD5E0',
								borderRadius: 8,
								...inputText,
								textAlign: 'right'
							},
							numericInput.disabled && InputStyle.inputDisabled
						]}
					/>
				) : null}
				{settingsAction ? (
					<View style={{marginVertical: 8, marginRight: 8}}>
						<TouchableOpacity
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								settingsAction();
							}}>
							<FontAwesomeIcon
								icon={faCog}
								size={20}
								style={styles.textSequence}
							/>
						</TouchableOpacity>
					</View>
				) : null}
				{icon ? (
					<View style={{marginVertical: 8, marginRight: 8}}>
						<TouchableOpacity
							onPress={() => {
								ReactNativeHapticFeedback.trigger(
									'impactMedium',
									hapticOptions
								);
								actionElement(item);
							}}>
							<FontAwesomeIcon
								icon={icon.name}
								size={20}
								style={styles.textSequence}
								color={icon.color}
							/>
						</TouchableOpacity>
					</View>
				) : null}
			</View>
		</View>
	);
}

const localStyles = StyleSheet.create({
	// Texte des lignes : style centralisé (Input.tsx).
	label: stackLabelText
});
