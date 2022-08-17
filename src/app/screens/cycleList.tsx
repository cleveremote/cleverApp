import React, { Component } from 'react';
import { ScrollView, VStack, Center, NativeBaseProvider, Box, IconButton } from 'native-base';
import { connect } from 'react-redux';
import {
    loadConfiguration,
    listenerEvents,
    loadCycle,
    saveCycle
} from '../../module/process/infrasctructure/store/actions/processActions';
import { CycleStack } from '../components/cycle/cycleStack';
import { Alert, RefreshControl } from 'react-native';
import Orientation, { OrientationType } from 'react-native-orientation-locker';
import { hapticOptions, ICyclesProps, navigationCycleType } from '../data/cycleTypes';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';



const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};
type MyProps = {
    loadConfiguration: Function;
    listenerEvents: Function;
    process: any;
    navigation: navigationCycleType
};



type MyState = { configuration: string; refreshing: boolean, orientation: OrientationType };

class CycleList extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);

        this.state = {
            configuration: '',
            refreshing: false,
            orientation: OrientationType.PORTRAIT
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
    
    render() {
        const wait = (timeout: any) => {
            return new Promise((resolve) => setTimeout(resolve, timeout));
        };
        const onRefresh = () => {
            this.setState({ refreshing: true });
            wait(2000).then(() => this.setState({ refreshing: false }));
        };
        return (
            <NativeBaseProvider>
                
                <ScrollView alignSelf="stretch" my={1} refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={onRefresh} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack space={2} my={1} alignSelf="stretch">
                        {this.props.process.cycles?.map((cycle: any) => CycleStack(cycle, this.props.navigation, this.state.orientation))}
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }

   

    componentWillUnmount() {
       // this._unsubscribe();
    }

}

const mapStateToProps = (state: any) => ({
    process: state.configuration
});

export default connect(mapStateToProps, {
    loadConfiguration,
    listenerEvents
})(CycleList);


