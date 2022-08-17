import * as React from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, FormControl, Input, TextArea, IconButton } from 'native-base';
import { connect } from 'react-redux';
import { Alert, Keyboard, RefreshControl } from 'react-native';
import { OrientationType } from 'react-native-orientation-locker';
import { faEthernet, faFloppyDisk, faGear, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { DeleteItemMenu, MenuItemTest } from '../components/cycleMenu';
import { ModuleStack } from '../components/moduleStack';
import { hapticOptions } from '../data/cycleTypes';
import { updateSequence } from '../../module/process/infrasctructure/store/actions/processActions';
import { HeaderBackButton } from '@react-navigation/elements';


const options = {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: true
};
type MyProps = {
    loadCycle: Function;
    updateSequence: Function;
    loadConfiguration: Function;
    listenerEvents: Function;
    process: any;
    navigation: any;
    route: any;
    //
    configuration: any;
    module: number;
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
    sequenceFormData: any;
    saveUnchangedData: boolean;
};

export class SequenceSettings extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);
        this.state = {
            configuration: '',
            orientation: OrientationType.PORTRAIT,
            refreshing: false,
            sequenceFormData: this.props.route.params.item || { id: 'temp_' + Math.random() },
            saveUnchangedData: false
        };
    }
    public headerRightCycleSettingsScreen() {
        const _t = this;
        return (
            <Box>
                <IconButton size={30} icon={<FontAwesomeIcon icon={faFloppyDisk} size={30} color={'#60a5fa'} />}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                        _t._saveSequence(true);
                    }} />
            </Box>
        );
    }
    public componentDidMount() {

        this.props.navigation.setOptions({
            headerRight: () => this.headerRightCycleSettingsScreen(),
            headerLeft: () => (<HeaderBackButton onPress={() => { this.props.navigation.goBack() }} />)
        });

        const _t = this;
        this.props.navigation.addListener('beforeRemove', (e) => {
            if (!_t.state.saveUnchangedData) {
                return;
            }
            e.preventDefault();

            // Prompt the user before leaving the screen
            Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure to discard them and leave the screen?',
                [
                    { text: "save", style: 'cancel', onPress: () => { this._saveSequence(true); } },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        // If the user confirmed, then we dispatch the action we blocked earlier
                        // This will continue the action that had triggered the removal of the screen
                        onPress: () => this.props.navigation.dispatch(e.data.action),
                    },
                ]
            );
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

                <FormControl >
                    <MenuItemTest name={'General'} icon={faGear}
                        renderElements={[
                            < Input key={11} placeholder='Name*' onSubmitEditing={Keyboard.dismiss} my={1} ml={10} mr={2}
                                defaultValue={this.state.sequenceFormData?.name}
                                onChangeText={value => this.setState({ sequenceFormData: { ...this.state.sequenceFormData, name: value }, saveUnchangedData: true })} />,
                            < TextArea key={12} placeholder='Description' autoCompleteType={undefined} my={1} ml={10} mr={2}
                                defaultValue={this.state.sequenceFormData?.description}
                                onChangeText={value => this.setState({ sequenceFormData: { ...this.state.sequenceFormData, description: value }, saveUnchangedData: true })} />
                        ]}
                    />

                    <MenuItemTest name={'Security'} icon={faGear}
                        renderElements={[
                            < Input key={13} placeholder='Max duration*' onSubmitEditing={Keyboard.dismiss} my={1} ml={10} mr={2}
                                defaultValue={this.state.sequenceFormData?.maxDuration}
                                onChangeText={value => this.setState({ sequenceFormData: { ...this.state.sequenceFormData, maxDuration: value }, saveUnchangedData: true })} />
                        ]}
                    />

                    <MenuItemTest name={'Modules'} icon={faEthernet}
                        renderElements={[
                            <Box alignSelf={'flex-end'} my={2}>
                                <IconButton size={30} onPress={() => {
                                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                                    navigation.navigate('ModuleSettings', { cycleId: this.props.route.params.cycleId, sequenceId: this.state.sequenceFormData.id });
                                }}
                                    icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} />}
                                />
                            </Box>,
                            <VStack key={14} space={2} alignSelf="stretch">
                                {this.state.sequenceFormData?.modules?.map((module: any) => module.id && module.id.indexOf('deleted_') > -1 ? null : ModuleStack(module, (item) => {
                                    this.deleteModule(item)
                                }))}
                            </VStack>
                        ]}
                    />

                    <DeleteItemMenu OnConfirm={() => {
                        this._deleteItem(navigation);

                    }
                    } />
                </FormControl >
            </Box >
        );
    }

    private deleteModule(item) {
        const t = item;

        const index1 = this.state.sequenceFormData.modules.findIndex(x => x.portNum === item.portNum);
        const modules = [...this.state.sequenceFormData.modules];
        let moduleToMutate = { ...item, id: 'deleted_' + item.portNum };
        modules[index1] = moduleToMutate;
        const cycle1 = { ...this.state.sequenceFormData, modules: modules };
        this.setState({ sequenceFormData: cycle1 }, () => {
            this._saveSequence();
        });
    }

    private _deleteItem(navigation) {
        this.setState({ sequenceFormData: { ...this.state.sequenceFormData, id: `deleted_${this.state.sequenceFormData.id}` } }, () => {
            console.log('Value is:', this.state.sequenceFormData);
            this._saveSequence(true);
        });
    }


    render() {
        return this.CycleSettings({ navigation: this.props.navigation });
    }

    componentDidUpdate(prevProps, prevState) {
        const currentCycle = this.props.configuration.cycles.find(x => x.id === this.props.route.params.cycleId);
        const prevCycle = prevProps.configuration.cycles.find(x => x.id === this.props.route.params.cycleId);
        const sequence = currentCycle?.sequences?.find(x => x.id === this.state.sequenceFormData.id);
        const prevsequence = prevCycle?.sequences?.find(x => x.id === this.state.sequenceFormData.id);
        if (sequence !== prevsequence) {
            this.setState({ sequenceFormData: sequence });
        }

        if (this.props.module !== prevProps.module) {
            this._updateModule(this.props.module);
        }
    }

    private _updateModule(module) {
        const configuration = this.props.configuration;
        const cycle = configuration.cycles?.find(cycle => cycle.id === module.cycleId);
        const sequence = cycle?.sequences?.find(x => x.id === module.sequenceId) || this.state.sequenceFormData;


        if (!sequence.modules) {
            sequence.modules = [];
        }
        const modules = [...this.state.sequenceFormData.modules];
        if (!modules.includes(module.item.portNum)) {
            modules.push(module.item);
        }

        const sequence1 = { ...this.state.sequenceFormData, modules: modules };
        this.setState({ sequenceFormData: sequence1 }, () => {
            this._saveSequence();
        });


    }

    private _saveSequence(goBack: boolean=false) {
        this.setState({ saveUnchangedData: false }, () => {
            this.props.updateSequence({ cycleId: this.props.route.params.cycleId, item: this.state.sequenceFormData });
            if (goBack) {
                this.props.navigation.goBack();
            }
        });

    }

}
const mapStateToProps = (state: any) => ({
    configuration: state.configuration,
    module: state.configuration.module
});

export default connect(mapStateToProps, {
    updateSequence
})(SequenceSettings);