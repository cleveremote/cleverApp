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

    private onSwitch(cycleData: any, value: any) {
        const dto = {
            id: cycleData.id,
            status: 'STOPPED',
            action: !value ? 'OFF' : 'ON',
            function: 'FUNCTION',
            mode: 'MANUAL',
            type: 'FORCE',
            duration: 0
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
                            onSwitch={this.onSwitch.bind(this, cycle)} />
                            
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


