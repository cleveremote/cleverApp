import * as React from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, FormControl, Input, TextArea, IconButton } from 'native-base';
import { connect } from 'react-redux';
import { Alert, GestureResponderEvent, Keyboard, RefreshControl } from 'react-native';
import { OrientationType } from 'react-native-orientation-locker';
import { faEthernet, faFloppyDisk, faGear, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { DeleteItemMenu, MenuAccordion } from '../../components/common/cycleMenu';
import { ModuleStack } from '../../components/cycle/moduleStack';
import { hapticOptions } from '../../data/cycleTypes';
import { updateSequence } from '../../../module/process/infrasctructure/store/actions/processActions';
import { HeaderBackButton } from '@react-navigation/elements';
import { navigationHeader } from '../../components/common/navigationHeaders';

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

type MyState = {
    configuration: string;
    orientation: OrientationType,
    refreshing: boolean,
    sequenceFormData: any;
    saveUnchangedData: boolean;
    activeMenu: string | undefined;
};

export class SequenceSettings extends Component<MyProps, MyState> {

    constructor(props: MyProps) {
        super(props);
        this.state = {
            configuration: '',
            orientation: OrientationType.PORTRAIT,
            refreshing: false,
            sequenceFormData: (this.props.route.params.item?.id && this.props.route.params.item) || this.defaultSequenceData(),
            saveUnchangedData: false,
            activeMenu: 'General'
        };
    }

    public defaultSequenceData() {
        const cycleString = `{"id":"${Math.random()}","name":"new sequence","description":"new sequence","maxDuration":50000,"modules":[]}`;
        return JSON.parse(cycleString);
    }

    public componentDidMount() {

        this.props.navigation.setOptions({
            headerRight: navigationHeader.bind(this, () => this._saveSequence(true), faFloppyDisk),
            headerLeft: () => (<HeaderBackButton onPress={() => { this.props.navigation.goBack() }} />)
        });

        this.props.navigation.addListener('beforeRemove', this.checkChanges.bind(this));
    }


    private checkChanges(e: any) {
        if (!this.state.saveUnchangedData) {
            return;
        }
        e.preventDefault();
        Alert.alert(
            'Discard changes?',
            'You have unsaved changes. Are you sure to discard them and leave the screen?',
            [
                { text: "save", style: 'cancel', onPress: () => { this._saveSequence(true); } },
                { text: 'Discard', style: 'destructive', onPress: () => this.props.navigation.dispatch(e.data.action) },
            ]
        );
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

    public SequenceMenu({ navigation }: { navigation: any }) {
        return (
            <Box>
                <FormControl>
                    <MenuAccordion name={'General'} icon={faGear} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
                        renderElements={[
                            < Input key={11} placeholder='Name*' onSubmitEditing={Keyboard.dismiss} my={1} ml={10} mr={2}
                                defaultValue={this.state.sequenceFormData?.name}
                                onChangeText={value => this.setState({ sequenceFormData: { ...this.state.sequenceFormData, name: value }, saveUnchangedData: true })} />,
                            < TextArea key={12} placeholder='Description' autoCompleteType={undefined} my={1} ml={10} mr={2}
                                defaultValue={this.state.sequenceFormData?.description}
                                onChangeText={value => this.setState({ sequenceFormData: { ...this.state.sequenceFormData, description: value }, saveUnchangedData: true })} />
                        ]} />

                    <MenuAccordion name={'Security'} icon={faGear} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
                        renderElements={[
                            < Input key={13} placeholder='Max duration*' onSubmitEditing={Keyboard.dismiss} my={1} ml={10} mr={2}
                                defaultValue={(this.state.sequenceFormData?.maxDuration).toString()}
                                onChangeText={value => this.setState({ sequenceFormData: { ...this.state.sequenceFormData, maxDuration: value === '' ? '' : Number(value) }, saveUnchangedData: true })} />
                        ]} />

                    <MenuAccordion name={'Modules'} icon={faEthernet} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
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
                                {this.state.sequenceFormData?.modules?.map((module: any) => module.id && module.id.indexOf('deleted_') > -1 ? null : ModuleStack(module, (item: any) => {
                                    this.deleteModule(item)
                                }))}
                            </VStack>
                        ]} />

                    <DeleteItemMenu OnConfirm={() => {
                        this._deleteItem();
                    }} />

                </FormControl >
            </Box >
        );
    }

    private deleteModule(item: any) {
        const index1 = this.state.sequenceFormData.modules.findIndex((x: any) => x.portNum === item.portNum);
        const modules = [...this.state.sequenceFormData.modules];
        let moduleToMutate = { ...item, id: 'deleted_' + item.portNum };
        modules[index1] = moduleToMutate;
        const cycle1 = { ...this.state.sequenceFormData, modules: modules };
        this.setState({ sequenceFormData: cycle1 }, () => {
            this._saveSequence();
        });
    }

    private _deleteItem() {
        this.setState({ sequenceFormData: { ...this.state.sequenceFormData, id: `deleted_${this.state.sequenceFormData.id}` } }, () => {
            console.log('Value is:', this.state.sequenceFormData);
            this._saveSequence(true);
        });
    }


    render() {
        return (
            <NativeBaseProvider>
                <ScrollView alignSelf="stretch" my={5} refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh.bind(this)} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack alignSelf="stretch" shadow={3}>
                        <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                            {this.SequenceMenu({ navigation: this.props.navigation })}
                        </Box>
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }

    componentDidUpdate(prevProps: any, prevState: any) {
        const currentCycle = this.props.configuration.cycles?.find((x: any) => x.id === this.props.route.params.cycleId);
        const prevCycle = prevProps.configuration.cycles?.find((x: any) => x.id === this.props.route.params.cycleId);
        const sequence = currentCycle?.sequences?.find((x: any) => x.id === this.state.sequenceFormData.id);
        const prevsequence = prevCycle?.sequences?.find((x: any) => x.id === this.state.sequenceFormData.id);
        if (sequence !== prevsequence) {
            this.setState({ sequenceFormData: sequence });
        }

        if (this.props.module !== prevProps.module) {
            this._updateModule(this.props.module);
        }
    }

    private _updateModule(module: any) {
        const configuration = this.props.configuration;
        const cycle = configuration.cycles?.find((x: any) => x.id === module.cycleId);
        const sequence = cycle?.sequences?.find((x: any) => x.id === module.sequenceId) || this.state.sequenceFormData;


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

    private _saveSequence(goBack: boolean = false) {
        this.setState({ saveUnchangedData: false }, () => {
            console.log('_saveSequence',this.state.sequenceFormData);
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