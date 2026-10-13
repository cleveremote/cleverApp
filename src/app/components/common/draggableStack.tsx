import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import React from 'react';
import {hapticOptions, SequenceItem} from '../../data/cycleTypes';
import DraggableFlatList, {
	RenderItemParams,
	ScaleDecorator
} from 'react-native-draggable-flatlist';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {styles} from '../../styles/cycleStyles';
import {TouchableOpacity} from 'react-native';

export function DragableSequences({
	onDrag = () => {},
	onDragEnd,
	stackElement,
	data,
	scrollEnabled = true
}: {
	onDrag: Function;
	onDragEnd: Function;
	stackElement: Function;
	data: any[];
	scrollEnabled?: boolean;
}) {
	const renderItem = ({item, drag, isActive}: RenderItemParams<any>) => {
		isActive &&
			ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
		return (
			<ScaleDecorator>
				<TouchableOpacity
					onLongPress={() => {
						onDrag();
						drag();
					}}
					disabled={isActive}
					style={styles.rowItem}>
					{stackElement(item, isActive)}
				</TouchableOpacity>
			</ScaleDecorator>
		);
	};
	return (
		<GestureHandlerRootView style={{width: '100%'}}>
			<DraggableFlatList
				data={data}
				scrollEnabled={scrollEnabled}
				onDragEnd={({data}) => {
					onDragEnd(data);
				}}
				keyExtractor={item => item.id || item.mode}
				renderItem={renderItem}
			/>
		</GestureHandlerRootView>
	);
}
