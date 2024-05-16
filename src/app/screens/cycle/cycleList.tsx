import React, { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, IconButton } from 'native-base';
import { connect } from 'react-redux';
import { loadConfiguration, listenerEvents, executeCycle } from '../../../module/process/infrasctructure/store/actions/processActions';
import { CycleStack } from '../../components/cycle/cycleStack';
import { RefreshControl } from 'react-native';
import Orientation, { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, navigationCycleType } from '../../data/cycleTypes';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BLEService } from './BLEService';

type MyProps = {
    loadConfiguration: Function;
    listenerEvents: Function;
    configuration: any;
    navigation: navigationCycleType,
    executeCycle: Function;
};

type MyState = { configuration: string; refreshing: boolean, orientation: OrientationType, activeMenu: string | undefined };

class CycleList extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);

        this.state = {
            configuration: '',
            refreshing: false,
            orientation: OrientationType.PORTRAIT,
            activeMenu: undefined
        };
    }

    public headerRightCycleSettingsScreen() {
        const _t = this;
        return (
            <Box>
                <IconButton size={30} icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        _t.props.navigation.navigate('Settings')
                    }} />
            </Box>
        );
    }

    public async componentDidMount() {
        const initial = Orientation.getInitialOrientation();
        this.setState({ orientation: initial });
        if (initial === 'PORTRAIT') {
            console.log("init PORTRAIT: ", initial);
        } else {
            console.log("PORTRAIT not: ", initial);
        }
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

        Orientation.addOrientationListener((o) => {
            this.setState({ orientation: o });
            console.log("Current UI Orientation: ", o);
        });

        this.props.navigation.setOptions({
            headerRight: () => this.headerRightCycleSettingsScreen()
        });
    }

    public closeSibillings(isExpended: boolean, current: string) {
        if (isExpended) {
            this.setState({ activeMenu: current });
        } else {
            this.setState({ activeMenu: undefined });
        }
    }

    private onSwitch(cycleData: any, value: any, type: string) {

        BLEService.initializeBLE().then(
            () => {
                BLEService.scanDevices(async (device) => {
                    console.log("scanDevices ");
                    await BLEService.connectToDevice(device.id)
                        .then(async () => {
                            await BLEService.discoverAllServicesAndCharacteristicsForDevice()
                            console.log('discoverAllServicesAndCharacteristicsForDevice');
                        })
                        .then(async (device)=>{
                            await BLEService.writeCharacteristicWithResponseForDevice(
                                '22222222-3333-4444-5555-666666666666',
                                '22222222-3333-4444-5555-666666666669',
                                'dGVzdCAxMzM='
                              );
                              console.log('writeCharacteristicWithoutResponseForDevice');
                        });

                   

                }, ['22222222-3333-4444-5555-666666666666']);
            }
        );

        const dto = {
            id: cycleData.id,
            status: 'STOPPED',
            action: !value ? 'OFF' : 'ON',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: type,//'INIT',// 'QUEUED'
            duration: 0
        }
        this.props.executeCycle(dto);
    }

    private onSkip(sequenceId: string) {
        const dto = {
            id: sequenceId,
            status: 'STOPPED',
            action: 'OFF',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: 'SKIP',// 'QUEUED'
            duration: 0
        }
        this.props.executeCycle(dto);
    }

    private onExecute(id: string, ms: number) {
        const dto = {
            id: id,
            status: 'STOPPED',
            action: 'ON',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: 'INIT',// 'QUEUED'
            duration: ms
        }
        this.props.executeCycle(dto);
    }

    render() {
        return (
            <NativeBaseProvider>
                <ScrollView alignSelf="stretch" my={1} refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack space={2} my={1} alignSelf="stretch">
                        {this.props.configuration.cycles?.map((cycle: any) =>
                            <CycleStack cycleData={cycle}
                                navigation={this.props.navigation}
                                orientation={this.state.orientation}
                                closeSibillings={this.closeSibillings.bind(this)}
                                current={this.state.activeMenu}
                                onSwitch={this.onSwitch.bind(this, cycle)}
                                onSkip={this.onSkip.bind(this)}
                                onExecute={this.onExecute.bind(this)} />
                        )}
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }

    private onRefresh() {
        const wait = (timeout: any) => {
            return new Promise((resolve) => setTimeout(() => resolve, timeout));
        };
        this.setState({ refreshing: true });
        wait(2000).then(() => this.setState({ refreshing: false }));
    }



    componentWillUnmount() {
        // this._unsubscribe();
    }

}

const mapStateToProps = (state: any) => ({
    configuration: state.configuration
});

export default connect(mapStateToProps, {
    executeCycle,
    loadConfiguration,
    listenerEvents
})(CycleList);


