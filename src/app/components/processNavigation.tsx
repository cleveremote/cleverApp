import React, { Component } from 'react';
import { ScrollView, VStack, Center, NativeBaseProvider, View,Text } from 'native-base';
import { connect } from 'react-redux';
import {
    loadConfiguration,
    listenerEvents
} from '../../module/process/infrasctructure/store/actions/processActions';
import { testcoMPOSANT } from './stack';
import { RefreshControl } from 'react-native';
import processList from './processList';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeBaseConfigProvider } from 'native-base/lib/typescript/core/NativeBaseContext';

const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};
type MyProps = {
    loadConfiguration: Function;
    listenerEvents: Function;
    process: any;
    navigation: any;
};
type MyState = { configuration: string; refreshing: boolean };

class ProcessNavigation extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);

        this.state = {
            configuration: '',
            refreshing: false
        };
    }

    public async componentDidMount() {

    }

    public updateInput(text: string) {
        return this.setState({ configuration: text });
    }

    



    render() {
        const ProcessStack = createNativeStackNavigator();
        return (
            <ProcessStack.Navigator >
                <ProcessStack.Screen name="Cycles" options={{headerShown: false}} component={processList} />
                <ProcessStack.Screen name="Schedule" component={DetailsScreen} />
            </ProcessStack.Navigator>
        );
    }
}

const mapStateToProps = state => ({
    process: state.process
});

export default ProcessNavigation //,{ navigation }

function DetailsScreen() {
    return (
        <NativeBaseProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>Details123456!</Text>
        </View>
        </NativeBaseProvider>
    );
}

