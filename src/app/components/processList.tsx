import React, { Component } from 'react';
import { ScrollView, VStack, Center, NativeBaseProvider } from 'native-base';
import { connect } from 'react-redux';
import {
    loadConfiguration,
    listenerEvents
} from '../../module/process/infrasctructure/store/actions/processActions';
import { testcoMPOSANT } from './stack';
import { RefreshControl } from 'react-native';
   
    

const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};
type MyProps = {
    loadConfiguration: Function;
    listenerEvents: Function;
    process: any;
    navigation:any;
};
type MyState = { configuration: string; refreshing: boolean };

class processList extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);

        this.state = {
            configuration: '',
            refreshing: false
        };
    }

    public async componentDidMount() {
        this.props
            .loadConfiguration()
            .then((response: { configuration: string }) => {
                console.log('loadConfiguration', response);
            });

        this.props
            .listenerEvents()
            .then((response: { configuration: string }) => {
                console.log('listenerEvents', response);
            });
    }

    public updateInput(text: string) {
        return this.setState({ configuration: text });
    }

    public getProcesses(configuration: string) {
        const processes = [];
        if (configuration) {
            const objConfig = JSON.parse(configuration);

            objConfig.cycles.forEach(cycle => {
                processes.push({
                    id: cycle.id,
                    name: cycle.name,
                    duration: 'cycle.duration',
                    style: cycle.style
                });
            });
        }

        return processes;
    }

    render() {
        const wait = timeout => {
            return new Promise(resolve => setTimeout(resolve, timeout));
        };
        const onRefresh = () => {
            this.setState({ refreshing: true });
            wait(2000).then(() => this.setState({ refreshing: false }));
        };
        return (
            <NativeBaseProvider>

                <Center flex={1}>
                    <ScrollView
                        alignSelf="stretch"
                        _contentContainerStyle={{ px: '3' }}>
                        <RefreshControl
                            refreshing={this.state.refreshing}
                            onRefresh={onRefresh}
                        />
                        
                        <VStack
                            space={3}
                            alignItems="center"
                            alignSelf="stretch">

                            {this.props.process.configuration?.map(el => testcoMPOSANT(el,this.props.navigation))}
                        </VStack>
                    </ScrollView>
                </Center>
            </NativeBaseProvider>
        );
    }
}

const mapStateToProps = state => ({
    process: state.process
});

export default connect(mapStateToProps, {
    loadConfiguration,
    listenerEvents
})(processList); //,{ navigation }


