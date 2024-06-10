import React, { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, FormControl, Input, TextArea, Flex, Text, IconButton, Select, CheckIcon } from 'native-base';
import { Alert, Keyboard, RefreshControl } from 'react-native';
import { OrientationType } from 'react-native-orientation-locker';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { faCheckCircle, faFloppyDisk, faGear, faPlus, faRotateRight, faTrafficLight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { getColors, hapticOptions, MyProps, MyState } from '../../data/cycleTypes';
import { styles } from '../../styles/cycleStyles';
import { DeleteItemMenu, MenuAccordion } from '../../components/common/cycleMenu';
import { SequenceStack } from '../../components/cycle/sequenceStack';
import { connect } from 'react-redux';
import { saveCycle, executePartialSync, executeCycle } from '../../../module/process/infrasctructure/store/actions/processActions';
import { HeaderBackButton } from '@react-navigation/elements';
import { DragableSequences } from '../../components/common/draggableStack';
import { navigationHeader } from '../../components/common/navigationHeaders';



export class CycleSettings extends Component<MyProps, MyState> {

    public myRef: any;
    constructor(props: MyProps) {
        super(props);
        this.myRef = React.createRef();
        this.state = {
            configuration: '',
            orientation: OrientationType.PORTRAIT,
            refreshing: false,
            sequencesData: [],
            formData: {},
            isOpen: false,
            enableScroll: true,
            cycleFormData: props.route.params?.id ? (props.configuration.cycles.find(x => x.id === props.route.params?.id)) : this.defaultCycleData(),
            saveUnchangedData: false,
            activeMenu: 'Generale'
        };
    }

    public componentDidMount() {

        this.props.navigation.setOptions({
            headerRight: navigationHeader.bind(this, () => this._saveCycle(true), 'check-circle',false),
            headerLeft: navigationHeader.bind(this, () => this.props.navigation.goBack(), 'arrow-alt-circle-left',false),
                //  (<HeaderBackButton tintColor='#60a5fa' onPress={() => { this.props.navigation.goBack() }} />)
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
                { text: "save", style: 'cancel', onPress: () => { this._saveCycle(true, true); } },
                { text: 'Discard', style: 'destructive', onPress: () => this.props.navigation.dispatch(e.data.action) },
            ]
        );
    }


    public PrioritySection() {
        return DragableSequences(
            () => { this.setState({ enableScroll: false }) },
            (data: any[]) => {
                const prior: any[] = [];
                data.forEach((d, index) => prior.push({ mode: d.mode, priority: index }));
                this.setState({ cycleFormData: { ...this.state.cycleFormData, modePriority: prior }, saveUnchangedData: true, enableScroll: true })
            },
            (item: any, isActive: boolean) => {
                return (
                    <Box alignSelf="stretch" bg={isActive ? '#60a5fa' : 'white'} rounded="xl" shadow={3} m={1}>
                        <Flex direction="row">
                            <Text flex={2} alignSelf={'flex-start'} style={isActive ? styles.textDrag : styles.text} m={2}>{item.mode}</Text>
                            <Text alignSelf={'flex-end'} display={this.state.cycleFormData.modePriority.findIndex((x: any) => x.mode === item.mode) === 0 ? 'flex' : 'none'} style={isActive ? styles.textPriorityDrag : styles.textPriority} m={2}>higher</Text>
                            <Text alignSelf={'flex-end'} display={this.state.cycleFormData.modePriority.findIndex((x: any) => x.mode === item.mode) === 2 ? 'flex' : 'none'} style={isActive ? styles.textPriorityDrag : styles.textPriority} m={2}>lowest</Text>
                        </Flex>
                    </Box>
                )
            },
            this.state.cycleFormData.modePriority);
    }

    public closeSibillings(isExpended: boolean, current: string) {
        if (isExpended) {
            this.setState({ activeMenu: current });
        } else {
            this.setState({ activeMenu: undefined });
        }
    }

    public CycleMenu() {
        return (
            <Box key={this.state.cycleFormData.id}>
                <FormControl>
                    <MenuAccordion key={21} name={'General'} icon={faGear} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
                        renderElements={[
                            <Select _actionSheetContent={{ maxHeight: '2xl' }} placeholder="Choose cycle theme" placeholderTextColor="#000" bgColor={this.state.cycleFormData.style?.fontColor}
                                _selectedItem={{ bg: this.state.cycleFormData.style?.fontColor, endIcon: <CheckIcon size="5" /> }} my={1} ml={5} mr={1}
                                selectedValue={this.state.cycleFormData.style?.fontColor.split('.')[0]}
                                onValueChange={value => {
                                    const color = getColors().find(x => x.base === value);
                                    const fontColor = color?.base + '.500';
                                    const iconColor = { icon: color?.icon, base: color?.base + '.500' };
                                    const bgColor = color?.base + '.200';
                                    this.setState({ cycleFormData: { ...this.state.cycleFormData, style: { fontColor, iconColor, bgColor }, saveUnchangedData: true } })
                                }} >
                                {getColors().map((color) => <Select.Item label={''} value={color.base} bgColor={color.base + '.200'} />)}
                            </Select>,
                            < Input key={1} placeholder='Name*' my={1} ml={10} mr={2}
                                defaultValue={this.state.cycleFormData.name} onSubmitEditing={Keyboard.dismiss}
                                onChangeText={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, name: value }, saveUnchangedData: true })} />,
                            <TextArea key={2} placeholder='Description' autoCompleteType={undefined} my={1} ml={10} mr={2}
                                defaultValue={this.state.cycleFormData.description} onSubmitEditing={Keyboard.dismiss}
                                onChangeText={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, description: value }, saveUnchangedData: true })} />
                        ]}
                    />

                    <MenuAccordion key={41} name={'Priority'} icon={faTrafficLight} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
                        renderElements={[this.PrioritySection()]} />

                    <MenuAccordion key={51} name={'Sequences'} icon={faRotateRight} closeSibillings={this.closeSibillings.bind(this)} current={this.state.activeMenu}
                        renderElements={[this.SequencesSection()]} />

                    <DeleteItemMenu key={61} OnConfirm={() => { this._deleteItem(); }} />

                </FormControl>
            </Box>
        );
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
    public SequencesSection() {
        return (<Box key={111}>
            <Box alignSelf={'flex-end'} my={2}>
                <IconButton size={30} onPress={() => {
                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                    this.props.navigation.navigate('SequenceSettings', { cycleId: this.state.cycleFormData.id });
                }}
                    icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} />}
                />
            </Box>
            {
                DragableSequences(
                    () => { this.setState({ enableScroll: false }) },
                    (data: any[]) => this.setState({ cycleFormData: { ...this.state.cycleFormData, sequences: data }, enableScroll: true, saveUnchangedData: true }),
                    (item: any, isActive: boolean) => <SequenceStack navigation={this.props.navigation} cycleId={this.state.cycleFormData.id} item={item} isActive={isActive} onSkip={this.onSkip.bind(this)} />,
                    this.state.cycleFormData.sequences.filter((x: any) => x.id.indexOf('delete') < 0))
            }
        </Box>);
    }

    render() {
        return (
            <NativeBaseProvider>
                <ScrollView alignSelf="stretch" my={5} scrollEnabled={this.state.enableScroll} refreshControl={<RefreshControl enabled={this.state.enableScroll} refreshing={this.state.refreshing} onRefresh={() => this.onRefresh()} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack alignSelf="stretch" shadow={3}>
                        <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                            {this.CycleMenu()}
                        </Box>
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }

    componentDidUpdate(prevProps: any, prevState: any) {
        const cycleId = this.props.route.params?.id;
        const currentCycle = this.props.configuration.cycles?.find((x: any) => x.id === cycleId) || this.state.formData;
        const previousCycle = prevProps.configuration.cycles?.find((x: any) => x.id === cycleId);

        if (cycleId && currentCycle && (currentCycle !== previousCycle)) {
            const data = this.__updateCycle({ ...currentCycle });
            this.setState({ cycleFormData: data });
        }

        if (this.props.sequence !== prevProps.sequence) {
            const seqData = this.__updateCycle(currentCycle, { ...this.props.sequence.item });
            this.setState({ cycleFormData: seqData }, () => { this._saveCycle(); });
        }
    }

    private _saveCycle(goback: boolean = false, haptic: boolean = false) {
        if (haptic) {
            ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }

        this.setState({ saveUnchangedData: false }, () => {
            const cycleDto = this.mappingToCycleDto(this.state.cycleFormData);
            this.props.executePartialSync(cycleDto);
            if (goback) {
                this.props.navigation.goBack();
            }
        });
    }

    private _deleteItem() {
        this.setState({ cycleFormData: { ...this.state.cycleFormData, id: `deleted_${this.state.cycleFormData.id}` } }, () => {
            this._saveCycle(true, true);
        });
    }

    public onRefresh() {
        const wait = (timeout: any) => {
            return new Promise(resolve => setTimeout(() => resolve, timeout));
        };
        this.setState({ refreshing: true });
        wait(2000).then(() => this.setState({ refreshing: false }));
    }

    public defaultCycleData() {
        const cycleString = `{"id":"${Math.random()}","name":"new cycle","description":"new description","style":{"bgColor":"cyan.200","fontColor":"blue.400","iconColor":{"base":"blue","icon":"#60a5fa"}},"sequences":[],"modePriority":[{"mode":"MANUAL","priority":0},{"mode":"TRIGGER","priority":1},{"mode":"SCHEDULE","priority":2}]}`;
        return JSON.parse(cycleString);
    }

    private mappingToCycleDto(formData: any): any {
        return {
            id: formData.id,
            name: formData.name,
            description: formData.description,
            style: {
                bgColor: formData.style.bgColor,
                fontColor: formData.style?.fontColor,
                iconColor: formData.style.iconColor
            },
            modePriority: formData.modePriority?.map((pr: any) => { return { mode: pr.mode, priority: pr.priority } }) || [],
            sequences: formData.sequences?.map((seq: any) => {
                const splittedId = seq.id.split('_');
                return {
                    id: splittedId[0] === 'new' ? seq.id.replace('_', '') : seq.id,
                    name: seq.name,
                    description: seq.description,
                    maxDuration: seq.maxDuration,
                    modules: seq.modules?.map((mod: any) => mod.id?.indexOf('deleted') > -1 ? `deleted_${mod.portNum}` : `${mod.portNum}`)
                }
            }) || []
        }
    }

    private __updateCycle(cycle: any, sequence?: any) {
        let updatedCycleFormData = cycle;
        if (sequence) {
            const sequences = cycle.sequences ? [...cycle.sequences] : [];
            const index = sequence.id.split('_');

            if (index[0] === 'deleted') {
                const indexToDelete = sequences.findIndex((x: any) => x.id === index[1]);
                sequences[indexToDelete] = sequence;
            } else {
                const currentIndex = sequences.findIndex((x: any) => x.id === sequence.id);
                if (currentIndex === -1) {
                    console.log('__updateCycle add', sequence);
                    sequences.push(sequence);
                } else {
                    console.log('__updateCycle update', sequence);
                    sequences[currentIndex] = sequence;
                }
            }

            updatedCycleFormData = { ...this.state.cycleFormData, sequences: sequences };
        }
        return updatedCycleFormData;
    }
}

const mapStateToProps = (state: any) => ({
    configuration: state.configuration,
    sequence: state.configuration.sequence
});

export default connect(mapStateToProps, {
    executeCycle,
    saveCycle,
    executePartialSync
})(CycleSettings);
