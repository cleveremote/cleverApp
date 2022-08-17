import { Box, Flex, Heading, Pressable, View } from "native-base";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ModalConfirmation } from "./modalDelete";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../data/cycleTypes";
import { useDispatch, useSelector } from "react-redux";
import { closeMenus } from "../../module/process/infrasctructure/store/actions/processActions";

export function MenuItemTest({ name, icon, color = '#60a5fa', isLast = false, renderElements }: { name: string, icon: IconDefinition, color?: string, isLast?: boolean, renderElements: JSX.Element[] }) {
    const [isExpanded, setExpended] = useState(false);
    const onPress = () => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        if (!isExpanded) {
            dispatch(closeMenus(name));
        }
        setExpended(!isExpanded)
    };



    const closeAll = useSelector((state) => state.configuration.closeAll)
   
    const dispatch = useDispatch();
    if (closeAll !== name && isExpanded) {
        onPress();
    }


    return (
        <Box>
            <Pressable onPress={onPress} h="45" bg="white" rounded="xl" key={name}>
                {({
                    isHovered,
                    isFocused,
                    isPressed
                }) => {
                    return <View style={{
                        flex: 1, flexDirection: 'row',
                        transform: [{
                            scale: isPressed ? 0.99 : 1
                        }]
                    }} ml={10} borderBottomColor={(!isLast || (isExpanded && closeAll === name)) ? color : 'white'} borderBottomWidth={(!isLast || (isExpanded && closeAll === name)) ? 1 : 0} >
                        <Box zIndex={99} style={{ flex: 1, alignItems: 'flex-start' }} my={2}>
                            <Flex direction="row">
                                <FontAwesomeIcon icon={icon} size={25} color={color} style={{ marginLeft: -30 }} />
                                <Heading flex={2} color={color} fontSize={19} ml={2}> {name} </Heading>
                            </Flex>
                        </Box>


                        <Box
                            style={{ flex: 1, alignItems: 'flex-end' }} mr={5} my={2}>
                            <Icon name={(isExpanded && closeAll === name) ? "angle-down" : 'angle-right'} size={25} color={color} />
                        </Box>

                    </View>;
                }}
            </Pressable>
            <Box display={(isExpanded && closeAll === name) ? 'flex' : 'none'}>
                {(isExpanded && closeAll === name) ? renderElements.map(element => element) : null}
            </Box>
        </Box>
    );
}

export function DeleteItemMenu({ name = 'Remove', icon = faTrash, color = '#fb1900', isLast = true, onCancel = () => { }, OnConfirm }: { name?: string, icon?: IconDefinition, color?: string, isLast?: boolean, onCancel?: () => void, OnConfirm: () => void }) {
    const [isOpened, setOpened] = useState(false);
    const onPress = () => {
        ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        setOpened(!isOpened)
    };
    return (<Box>
        <Pressable onLongPress={onPress} h="45" bg="white" rounded="xl" key={name}>
            {({
                isHovered,
                isFocused,
                isPressed
            }) => {
                return <View style={{
                    flex: 1, flexDirection: 'row',
                    transform: [{
                        scale: isPressed ? 0.99 : 1
                    }]
                }} ml={10} borderBottomColor={!isLast ? color : 'white'} borderBottomWidth={!isLast ? 1 : 0} >
                    <Box zIndex={99} style={{ flex: 1, alignItems: 'flex-start' }} my={2}>
                        <Flex direction="row">
                            <FontAwesomeIcon icon={icon} size={25} color={color} style={{ marginLeft: -30 }} />
                            <Heading flex={1} color={'red.600'} fontSize={19} ml={2}> {name} </Heading>
                            <Heading flex={2} color={'red.600'} fontSize={10} mt={1.5}> (long press to remove) </Heading>
                        </Flex>
                    </Box>
                </View>;
            }}
        </Pressable>
        <ModalConfirmation isOpen={isOpened}
            onClose={() => {
                onCancel();
                onPress();
            }}
            onDelete={() => {
                OnConfirm();
                onPress();
            }} />
    </Box>);
}