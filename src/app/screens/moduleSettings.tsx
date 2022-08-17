import * as React from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, FormControl, Input, TextArea, IconButton, Center, Image, Select, CheckIcon } from 'native-base';
import { connect } from 'react-redux';
import { Keyboard, RefreshControl } from 'react-native';
import { OrientationType } from 'react-native-orientation-locker';
import { faEthernet, faFloppyDisk, faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { DeleteItemMenu, MenuItemTest } from '../components/cycleMenu';
import { ModuleStack } from '../components/moduleStack';
import { getPorts, hapticOptions } from '../data/cycleTypes';
import { updateModule } from '../../module/process/infrasctructure/store/actions/processActions';


const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};
type MyProps = {
    loadCycle: Function;
    updateModule: Function;
    loadConfiguration: Function;
    listenerEvents: Function;
    process: any;
    navigation: any;
    route: any;
    //
    configuration: any;
};

type Item = {
    key: string;
    label: string;
    backgroundColor: string;
};

type SequenceItem = {
    id: string;
    name: string;
    description: string;
    duration: number;
    modules: number[];
};

type CycleType = {
    id: string;
    sequences: any[];
};

type MyState = {
    configuration: string; orientation: OrientationType, refreshing: boolean,
    moduleFormData: any;
};

export class ModuleSettings extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);
        this.state = {
            configuration: '',
            orientation: OrientationType.PORTRAIT,
            refreshing: false,
            moduleFormData: {}
        };
    }
    public headerRightCycleSettingsScreen() {
        const _t = this;
        return (
            <Box>
                <IconButton size={30} icon={<FontAwesomeIcon icon={faFloppyDisk} size={30} color={'#60a5fa'} />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        _t.props.updateModule({ cycleId: _t.props.route.params.cycleId, sequenceId: _t.props.route.params.sequenceId,  item: _t.state.moduleFormData });
                        _t.props.navigation.goBack();
                    }} />
            </Box>
        );
    }
    public componentDidMount() {

        this.props.navigation.setOptions({
            headerRight: () => this.headerRightCycleSettingsScreen()
        });


    }


    public CycleSettings({ navigation }) {
        const wait = (timeout: any) => {
            return new Promise(resolve => setTimeout(resolve, timeout));
        };
        const onRefresh = () => {
            this.setState({ refreshing: true });
            wait(2000).then(() => this.setState({ refreshing: false }));
        };

        return (
            <NativeBaseProvider>

                <ScrollView alignSelf="stretch" my={5} refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={onRefresh} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack alignSelf="stretch" shadow={3}>
                        <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                            {this.SequenceMenu({ navigation: this.props.navigation })}
                        </Box>
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }



    public SequenceMenu({ navigation }) {
        return (
            <Box>
                {/* <Center >
                    <Image width={'90%'} height={'90%'} source={{
                        uri: "https://hackster.imgix.net/uploads/attachments/217647/oDRh4lpYwoZHHrJiQR64.png?auto=compress%2Cformat&w=1280&h=960&fit=max"
                    }} alt="Alternate Text" />
                </Center> */}
                <FormControl >
                    <MenuItemTest name={'General'} icon={faGear} isLast={true}
                        renderElements={[
                            <Select placeholder="Choose port"
                                _selectedItem={{ bg: "blue.400", endIcon: <CheckIcon size="5" /> }} my={1} ml={5} mr={1}
                                onValueChange={value => this.setState({ moduleFormData: { ...this.state.moduleFormData, portNum: value } })}>
                                {getPorts([]).map((value) => <Select.Item label={`${value}`} value={`${value}`} />)}
                            </Select>
                        ]}
                    />
                </FormControl >
            </Box >
        );
    }


    render() {
        return this.CycleSettings({ navigation: this.props.navigation });
    }

    // componentDidUpdate(prevProps, prevState) {
    //     const currentCycle = this.props.configuration.cycles.find(x => x.id === this.props.route.params.cycleId);
    //     const prevCycle = prevProps.configuration.cycles.find(x => x.id === this.props.route.params.cycleId);
    //     const sequence = currentCycle.sequences.find(x => x.id === this.props.route.params.item.id);
    //     const prevsequence = prevCycle.sequences.find(x => x.id === this.props.route.params.item.id);
    //     if (sequence !== prevsequence) {
    //         this.setState({ sequenceFormData: sequence });
    //     }
    // }

}
const mapStateToProps = (state: any) => ({
    configuration: state.configuration,
});

export default connect(mapStateToProps, {
    updateModule
})(ModuleSettings);