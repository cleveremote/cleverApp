import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {IconDefinition} from '@fortawesome/free-solid-svg-icons';
import {styles} from '../../styles/cycleStyles';
import {hapticOptions} from '../../data/cycleTypes';

export function elementStack(
	item: any,
	actionElement: Function,
	label: string,
	icon: {name: IconDefinition; color: string}
) {
	return (
		<View
			style={{
				alignSelf: 'stretch',
				backgroundColor: 'white',
				borderRadius: 12,
				margin: 4,
				elevation: 3,
				shadowColor: '#000',
				shadowOffset: {width: 0, height: 1},
				shadowOpacity: 0.22,
				shadowRadius: 2.22
			}}
			key={item.id}>
			<View style={{flexDirection: 'row'}}>
				<Text
					style={[styles.textSequence, {flex: 1, marginVertical: 8, marginLeft: 8}]}>
					{label}
				</Text>
				<View style={{alignSelf: 'flex-end', marginVertical: 8, marginRight: 8}}>
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
			</View>
		</View>
	);
}
