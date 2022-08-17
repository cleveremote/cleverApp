
import React, { Component, useState } from 'react';
import { ScrollView, VStack, NativeBaseProvider, View, Text, FormControl, Input, Button, Heading, TextArea, Box, Pressable, Flex, IconButton, AlertDialog, Progress } from 'native-base';
import { Keyboard, RefreshControl, StyleSheet, TouchableOpacity, LogBox, Animated } from 'react-native';
import CycleList from '../../screens/cycleList';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList, { ScaleDecorator, } from "react-native-draggable-flatlist";
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCog, faFloppyDisk, faForward, faGear, faPalette, faPlus, faRotateRight, faTrash } from '@fortawesome/free-solid-svg-icons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import cycleSettings, { CycleSettings } from '../../screens/cycleSettings';
import sequenceSettings, { SequenceSettings } from '../../screens/sequenceSettings';
import { NavigationScreenConfigProps } from 'react-navigation';
import { hapticOptions, IPdpPageProps, RootStackParamList } from '../../data/cycleTypes';
import cycleList from '../../screens/cycleList';
import moduleSettings from '../../screens/moduleSettings';

const window = Dimensions.get('window');



class CycleNavigation extends Component {


    public async componentDidMount() {
        LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
    }

   

    public headerRightCycleScreen() {
        return (
            <Box>
                <IconButton size={30} icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                    }} />
            </Box>
        );
    }

    public headerRightCycleSettingsScreen() {
        return (
            <Box>
                <IconButton size={30} icon={<FontAwesomeIcon icon={faFloppyDisk} size={30} color={'#60a5fa'} />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        //console.log('open execution settings');
                        const t = cycleSettings
                    }} />
            </Box>
        );
    }

    public headerRightSequenceSettingsScreen() {
        return (
            <Box>
                <IconButton size={30} icon={<FontAwesomeIcon icon={faFloppyDisk} size={30} color={'#60a5fa'} />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                       
                        //console.log('open execution settings');
                    }} />
            </Box>
        );
    }


    render() {
        const ProcessStack = createNativeStackNavigator();
        return (
            <NativeBaseProvider>
                <ProcessStack.Navigator >
                    <ProcessStack.Screen name="Cycles" options={{ 
                        title: 'Cycles', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' },
                    }} component={cycleList} />
                    <ProcessStack.Screen  name="Settings"  options={{
                        title: 'Settings', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }
                    }} component={cycleSettings} />
                    <ProcessStack.Screen name="SequenceSettings" options={{
                        title: 'Sequence', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }
                    }} component={sequenceSettings} />
                    <ProcessStack.Screen  name="ModuleSettings"  options={{
                        title: 'Settings', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }
                    }} component={moduleSettings} />
                </ProcessStack.Navigator>
            </NativeBaseProvider>
        );
    }
}



export default CycleNavigation //,{ navigation }
