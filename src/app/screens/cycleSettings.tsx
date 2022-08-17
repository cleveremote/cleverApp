import React, { Component } from 'react';
import { ScrollView, VStack, NativeBaseProvider, Box, FormControl, Input, TextArea, Flex, Heading, View, Text, Pressable, IconButton, Progress, AlertDialog, Button, Select, CheckIcon } from 'native-base';
import { Alert, Keyboard, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { OrientationType } from 'react-native-orientation-locker';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { faCog, faFloppyDisk, faForward, faGear, faPalette, faPlus, faRotateRight, faTrafficLight, faTrash, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { cycleData, getColors, hapticOptions, Item, MyProps, MyState, Priorities, PriorityModes, SequenceItem } from '../data/cycleTypes';
import { styles } from '../styles/cycleStyles';
import { DeleteItemMenu, MenuItemTest } from '../components/cycleMenu';
import { SequenceStack } from '../components/sequenceStack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import {
    loadCycle,
    listenerEvents,
    saveCycle,
    executePartialSync
} from '../../module/process/infrasctructure/store/actions/processActions';
import { CycleStack } from '../components/cycle/cycleStack';
import { background } from 'native-base/lib/typescript/theme/styled-system';
import { color } from 'react-native-reanimated';
import { ModalConfirmation } from '../components/modalDelete';
import { HeaderBackButton } from '@react-navigation/elements';



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
                        this._saveCycle(true);

                    }} />
            </Box>
        );
    }

    public componentDidMount() {

        this.props.navigation.setOptions({
            headerRight: () => this.headerRightCycleSettingsScreen(),
            headerLeft: () => (<HeaderBackButton tintColor='#60a5fa' onPress={() => { this.props.navigation.goBack() }} />)
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
                    { text: "save", style: 'cancel', onPress: () => { this._saveCycle(); this.props.navigation.goBack(); } },
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

    public defaultCycleData() {
        const cycleString = `{"id":"new${Math.random()}","name":"new cycle","description":"new description","style":{"bgColor":"cyan.200","fontColor":"blue.400","iconColor":{"base":"blue","icon":"#60a5fa"}},"sequences":[],"modePriority":[{"mode":"MANUAL","priority":0},{"mode":"TRIGGER","priority":1},{"mode":"SCHEDULE","priority":2}]}`;
        return JSON.parse(cycleString);
    }


    public PrioritySection() {
        const renderItem = ({ item, drag, isActive }: RenderItemParams<Item>) => {
            return (
                <ScaleDecorator>
                    <TouchableOpacity onLongPress={() => {
                        this.setState({ enableScroll: false });
                        drag();
                    }} disabled={isActive} style={[styles.rowItem]}>
                        <Box alignSelf="stretch" bg={isActive ? '#60a5fa' : 'white'} rounded="xl" shadow={3} m={1}>
                            <Flex direction="row">
                                <Text flex={2} alignSelf={'flex-start'} style={isActive ? styles.textDrag : styles.text} m={2}>{item.mode}</Text>
                                <Text alignSelf={'flex-end'} display={this.state.cycleFormData.modePriority.findIndex(x => x.mode === item.mode) === 0 ? 'flex' : 'none'} style={isActive ? styles.textPriorityDrag : styles.textPriority} m={2}>higher</Text>
                                <Text alignSelf={'flex-end'} display={this.state.cycleFormData.modePriority.findIndex(x => x.mode === item.mode) === 2 ? 'flex' : 'none'} style={isActive ? styles.textPriorityDrag : styles.textPriority} m={2}>lowest</Text>
                            </Flex>
                        </Box>
                    </TouchableOpacity>
                </ScaleDecorator>
            );
        };

        return (
            <GestureHandlerRootView key={111} style={{ width: '100%' }}>
                <DraggableFlatList
                    data={this.state.cycleFormData.modePriority}
                    onDragEnd={({ data }) => {
                        const prior: any[] = [];
                        data.forEach((d, index) => prior.push({ mode: d.mode, priority: index }));
                        this.setState({ cycleFormData: { ...this.state.cycleFormData, modePriority: prior }, enableScroll: true })
                    }
                    }
                    keyExtractor={(item) => item.mode}
                    renderItem={renderItem}
                    debug={false}
                />
            </GestureHandlerRootView>
        );
    }


    public CycleMenu({ navigation }) {
        return (
            <Box key={this.state.cycleFormData.id}>
                <FormControl >

                    <MenuItemTest key={21} name={'General'} icon={faGear}
                        renderElements={[
                            < Input key={1} placeholder='Name*' my={1} ml={10} mr={2}
                                defaultValue={this.state.cycleFormData.name} onSubmitEditing={Keyboard.dismiss}
                                onChangeText={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, name: value }, saveUnchangedData: true })} />,
                            <TextArea key={2} placeholder='Description' autoCompleteType={undefined} my={1} ml={10} mr={2}
                                defaultValue={this.state.cycleFormData.description} onSubmitEditing={Keyboard.dismiss}
                                onChangeText={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, description: value }, saveUnchangedData: true })} />
                        ]}
                    />

                    <MenuItemTest key={31} name={'Appearence'} icon={faPalette}
                        renderElements={[
                            <Select placeholder="Choose fontColor color" bgColor={this.state.cycleFormData.style.fontColor}
                                _selectedItem={{ bg: "blue.400", endIcon: <CheckIcon size="5" /> }} my={1} ml={5} mr={1}
                                selectedValue={this.state.cycleFormData.style.fontColor}
                                onValueChange={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, style: { ...this.state.cycleFormData.style, fontColor: value }, saveUnchangedData: true } })} >
                                {getColors('font').map((color) => <Select.Item label={''} value={color} bgColor={color} />)}
                            </Select>,
                            <Select placeholder="Choose icon color" bgColor={this.state.cycleFormData.style.iconColor.icon}
                                _selectedItem={{ bg: "blue.400", endIcon: <CheckIcon size="5" /> }} my={1} ml={5} mr={1}
                                selectedValue={this.state.cycleFormData.style.iconColor}
                                onValueChange={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, style: { ...this.state.cycleFormData.style, iconColor: value }, saveUnchangedData: true } })} >
                                {getColors('icon').map((color) => <Select.Item label={''} value={color} bgColor={color.icon} />)}
                            </Select>,
                            <Select placeholder="Choose background color" bgColor={this.state.cycleFormData.style.bgColor}
                                _selectedItem={{ bg: "blue.400", endIcon: <CheckIcon size="5" /> }} my={1} ml={5} mr={1}
                                selectedValue={this.state.cycleFormData.style.bgColor}
                                onValueChange={value => this.setState({ cycleFormData: { ...this.state.cycleFormData, style: { ...this.state.cycleFormData.style, bgColor: value }, saveUnchangedData: true } })} >
                                {getColors('bg').map((color) => <Select.Item label={''} value={color} bgColor={color} />)}
                            </Select>
                        ]}
                    />

                    <MenuItemTest key={41} name={'Priority'} icon={faTrafficLight}
                        renderElements={[
                            this.PrioritySection()
                        ]}
                    />

                    <MenuItemTest key={51} name={'Sequences'} icon={faRotateRight}
                        renderElements={[
                            this.SequencesSection({ navigation })
                        ]}
                    />

                    <DeleteItemMenu key={61} OnConfirm={() => {
                        this._deleteItem(navigation);

                    }} />

                </FormControl >
            </Box >
        );
    }

    private _deleteItem(navigation) {
        this.setState({ cycleFormData: { ...this.state.cycleFormData, id: `deleted_${this.state.cycleFormData.id}` } }, () => {
            console.log('Value is:', this.state.cycleFormData);
            this._saveCycle();
            navigation.goBack();
        });
    }

    public SequencesSection({ navigation }) {
        return (<Box key={111}>
            <Box alignSelf={'flex-end'} my={2}>
                <IconButton size={30} onPress={() => {
                    ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
                    navigation.navigate('SequenceSettings', { cycleId: this.state.cycleFormData.id });
                }}
                    icon={<FontAwesomeIcon icon={faPlus} size={30} color={'#60a5fa'} />}
                />
            </Box>
            {this.DragableSequences(navigation)}
        </Box>);
    }

    public DragableSequences(navigation) {
        const renderItem = ({ item, drag, isActive }: RenderItemParams<SequenceItem>) => {
            isActive && ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions)
            return (
                <ScaleDecorator>
                    <TouchableOpacity onLongPress={() => {
                        this.setState({ enableScroll: false });
                        drag();
                    }} disabled={isActive} style={[styles.rowItem]}>
                        <SequenceStack navigation={navigation} cycleId={this.state.cycleFormData.id} item={item} isActive={isActive} />
                    </TouchableOpacity>
                </ScaleDecorator>
            );
        };
        return (
            <GestureHandlerRootView style={{ width: '100%' }}>


                <DraggableFlatList
                    data={this.state.cycleFormData.sequences.filter(x => x.id.indexOf('delete') < 0)}
                    onDragEnd={({ data }) => {
                        // save cycle instead of setState .
                        this.setState({ cycleFormData: { ...this.state.cycleFormData, sequences: data }, enableScroll: true, saveUnchangedData: true })
                    }}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                />
            </GestureHandlerRootView>
        );
    }



    public onRefresh() {
        const wait = (timeout: any) => {
            return new Promise(resolve => setTimeout(resolve, timeout));
        };
        this.setState({ refreshing: true });
        wait(2000).then(() => this.setState({ refreshing: false }));
    }

    render() {

        return (
            <NativeBaseProvider>
                <ScrollView alignSelf="stretch" my={5} scrollEnabled={this.state.enableScroll} refreshControl={<RefreshControl enabled={this.state.enableScroll} refreshing={this.state.refreshing} onRefresh={() => this.onRefresh()} style={{ alignItems: 'flex-start', justifyContent: 'flex-start', alignSelf: 'flex-start' }} />}>
                    <VStack alignSelf="stretch" shadow={3}>
                        <Box alignSelf="stretch" bg='white' mt={2} mx={5} rounded="xl" >
                            {this.CycleMenu({ navigation: this.props.navigation })}
                        </Box>
                    </VStack>
                </ScrollView>
            </NativeBaseProvider>
        );
    }

    private _getCycle(cycleId: string): any {
        const configuration = this.props.configuration;
        const cycle = configuration.cycles.find(cycle => cycle.id === cycleId);

        //faire des adaptation pour n'exploiter que le necessaire des données
        if (this.state.cycleFormData !== cycle) {
            this.setState({ cycleFormData: cycle }, () => {
                console.log('Value is:', this.state.cycleFormData);
            })
        }

    }

    private _updateSequence(sequence) {
        const configuration = this.props.configuration;
        let cycle = configuration.cycles.find(cycle => cycle.id === sequence.cycleId);
        cycle = cycle ? cycle : this.state.cycleFormData;
        const index = cycle && cycle.sequences ? cycle.sequences.findIndex(x => x.id === sequence.item.id) : -1;
        if (index >= 0) {
            const sequences = [...cycle.sequences];
            let sequenceToMutate = { ...sequences[index] };
            sequenceToMutate = sequence.item;
            sequences[index] = sequenceToMutate;
            const cycle1 = { ...this.state.cycleFormData, sequences: sequences };
            this.setState({ cycleFormData: cycle1 }, () => {
                this._saveCycle();
            });
        } else {
            const indexToDelete = sequence.item.id.split('_');
            if (indexToDelete[0] === 'delete') {
                const index1 = cycle.sequences.findIndex(x => x.id === indexToDelete[1]);
                const sequences = [...cycle.sequences];
                let sequenceToMutate = { ...sequences[index1] };
                sequenceToMutate = sequence.item;
                sequences[index1] = sequenceToMutate;
                const cycle1 = { ...this.state.cycleFormData, sequences: sequences };
                this.setState({ cycleFormData: cycle1 }, () => {
                    this._saveCycle();
                });
            } else {
                if (cycle.sequences) {
                    const sequences12 = [...cycle.sequences];
                    sequences12.push(sequence.item);
                    const cycle1 = { ...this.state.cycleFormData, sequences: sequences12 };
                    this.setState({ cycleFormData: cycle1 }, () => {
                        this._saveCycle();
                    });
                }
            }
        }
    }

    private _saveCycle(goback: boolean = false) {


        this.setState({ saveUnchangedData: false }, () => {

            const data = this.state.cycleFormData
            let cycle = {
                id: data.id,
                name: data.name,
                description: data.description,
                style: {
                    bgColor: data.style.bgColor,
                    fontColor: data.style.fontColor,
                    iconColor: data.style.iconColor
                }
            };
            const modePriority = [];

            data.modePriority?.forEach(pr => {
                modePriority.push({ mode: pr.mode, priority: pr.priority });
            })

            const sequences = [];
            data.sequences?.forEach(seq => {
                let sequence = {
                    id: seq.id,
                    name: seq.name,
                    description: seq.description,
                    duration: seq.duration,
                };
                const modules = [];
                seq.modules?.forEach(mod => {
                    if (mod.id?.indexOf('deleted') > -1) {
                        modules.push(`deleted_${mod.portNum}`)
                    } else {
                        modules.push(`${mod.portNum}`);
                    }

                })
                sequence = Object.assign(sequence, { modules })

                sequences.push(sequence)
            });

            cycle = Object.assign(cycle, { sequences }, { modePriority });

            const test = JSON.stringify(cycle);
            this.props.executePartialSync(cycle);
            if (goback) {
                this.props.navigation.goBack();
            }

        });



    }

    componentDidUpdate(prevProps, prevState) {
        if ((this.props.configuration.cycles !== prevProps.configuration.cycles) && this.props.route.params?.id) {
            this._getCycle(this.props.route.params.id);

        }
        if (this.props.sequence !== prevProps.sequence) {
            this._updateSequence(this.props.sequence);
        }
    }
}

const mapStateToProps = (state: any) => ({
    configuration: state.configuration,
    sequence: state.configuration.sequence
});

export default connect(mapStateToProps, {
    saveCycle,
    executePartialSync
})(CycleSettings);
