
import React, { Component } from 'react';
import { NativeBaseProvider } from 'native-base';
import { LogBox } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import cycleSettings from '../screens/cycle/cycleSettings';
import sequenceSettings from '../screens/cycle/sequenceSettings';
import cycleList from '../screens/cycle/cycleList';
import moduleSettings from '../screens/cycle/moduleSettings';
export class CycleNavigation extends Component {

    public async componentDidMount() {
        LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
    }

    render() {
        const ProcessStack = createNativeStackNavigator();
        return (
            <NativeBaseProvider>
                <ProcessStack.Navigator >
                    <ProcessStack.Screen name="Cycles" options={{
                        title: 'Cycles', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' },
                    }} component={cycleList} />
                    <ProcessStack.Screen name="Settings" options={{
                        title: 'Settings', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }
                    }} component={cycleSettings} />
                    <ProcessStack.Screen name="SequenceSettings" options={{
                        title: 'Sequence', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }
                    }} component={sequenceSettings} />
                    <ProcessStack.Screen name="ModuleSettings" options={{
                        title: 'Settings', headerTintColor: '#60a5fa', headerTitleStyle: { fontSize: 20, fontWeight: 'bold' }
                    }} component={moduleSettings} />
                </ProcessStack.Navigator>
            </NativeBaseProvider>
        );
    }
}
