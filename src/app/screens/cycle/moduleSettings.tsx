import * as React from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, FormControl, IconButton, Select, CheckIcon } from 'native-base';
import { connect } from 'react-redux';
import { RefreshControl } from 'react-native';
import { OrientationType } from 'react-native-orientation-locker';
import { faFloppyDisk, faGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { MenuAccordion } from '../../components/common/cycleMenu';
import { getPorts, hapticOptions } from '../../data/cycleTypes';
import { updateModule } from '../../../module/process/infrasctructure/store/actions/processActions';
import { navigationHeader } from '../../components/common/navigationHeaders';
import { HeaderBackButton } from '@react-navigation/elements';

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

type MyState = {
    configuration: string; orientation: OrientationType, refreshing: boolean,
    moduleFormData: any;
    activeMenu: string | undefined;
};

export class ModuleSettings extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);
        this.state = {
            configuration: '',
            orientation: OrientationType.PORTRAIT,
            refreshing: false,
            moduleFormData: {},
            activeMenu: 'General'
        };
    }

    public componentDidMount() {

        this.props.navigation.setOptions({
            headerRight: navigationHeader.bind(this, () => this._saveModule(true, true), faFloppyDisk)
        });
    }

    private _saveModule(goBack: boolean = false, haptic: boolean = false) {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }
        this.props.updateModule({ cycleId: this.props.route.params.cycleId, sequenceId: this.props.route.params.sequenceId, item: this.state.moduleFormData });
        if (goBack) {
            this.props.navigation.goBack();
        }

    }


    public onRefresh() {
        const wait = (timeout: any) => {
            return new Promise(resolve => setTimeout(() => resolve(null), timeout));
        };

        this.setState({ refreshing: true });
        wait(2000).then(() => this.setState({ refreshing: false }));
    }

    public closeSibillings(isExpended: boolean, current: string) {
        if (isExpended) {
            this.setState({ activeMenu: current });
        } else {
            this.setState({ activeMenu: undefined });
        }
    }

    public SequenceMenu() {
        return (
            <Box>
                <FormControl >
                    <MenuAccordion name={'General'} icon={faGear} isLast={true} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
                        renderElements={[
                            <Select _actionSheetContent={{ maxHeight: '2xl' }} placeholder="Choose port"
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
        return (
            <NativeBaseProvider>
                <ScrollView alignSelf="stretch" my={5} refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack alignSelf="stretch" shadow={3}>
                        <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                            {this.SequenceMenu()}
                        </Box>
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }

}

const mapStateToProps = (state: any) => ({
    configuration: state.configuration,
});

export default connect(mapStateToProps, {
    updateModule
})(ModuleSettings);