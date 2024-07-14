import { Box, Flex, Heading, Pressable, VStack, View } from "native-base";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Icon from 'react-native-vector-icons/FontAwesome5';
import React, { useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { ModalConfirmation } from "../modalDelete";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { hapticOptions } from "../../data/cycleTypes";

export function MenuAccordion({ name, icon, color = '#32404e', isLast = false, closeSibillings, current, onPress }: { name: string, icon: IconDefinition, color?: string, isLast?: boolean, closeSibillings?: Function, current?: string, onPress: Function }) {
    const [isExpanded, setExpended] = useState(false);

    return (
        <Box>
            <Pressable onPress={onPress} h="50px" bg="white" rounded="xl" key={name}>
                {({
                    isHovered,
                    isFocused,
                    isPressed
                }) => {
                    return <View style={{
                        flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
                        transform: [{
                            scale: isPressed ? 0.99 : 1
                        }]
                    }} borderBottomColor={(!isLast || isExpanded) ? color : 'white'} borderBottomWidth={(!isLast || isExpanded) ? 1 : 0} >
                        <VStack style={{  marginLeft: 10,justifyContent: 'center', alignItems: 'center', flexDirection: 'row',  }} flexDirection={"row"}>
                            <View
                                style={{
                                    width: 35,
                                    height: 35,
                                    borderRadius: 0.5 * 45,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderColor: color,
                                    borderWidth: 2.5,
                                }}>
                                <FontAwesomeIcon icon={icon} size={20} color={color} />
                            </View>
                            <Heading color={color} fontSize={15} ml={2}> {name} </Heading>
                        </VStack>

                        <Box
                            style={{ flex: 1, alignItems: 'flex-end' }} mr={5} >
                            <Icon name={(isExpanded) ? "angle-down" : 'angle-right'} size={20} color={'grey'} />
                        </Box>

                    </View>;
                }}
            </Pressable>
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
        <Pressable onLongPress={onPress} h="55" bg="white" rounded="xl" key={name}>
            {({
                isHovered,
                isFocused,
                isPressed
            }) => {
                return <View style={{
                    flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row',
                    transform: [{ scale: isPressed ? 0.99 : 1 }]
                }} borderBottomColor={!isLast ? color : 'white'} borderBottomWidth={!isLast ? 1 : 0} >
                    <VStack style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginLeft: 10 }} flexDirection={"row"}>

                        <View
                            style={{
                                width: 35,
                                height: 35,
                                borderRadius: 0.5 * 45,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderColor: color,
                                borderWidth: 2.5,
                            }}>
                            <FontAwesomeIcon icon={icon} size={20} color={color} />
                        </View>
                        <Heading flex={1} color={'red.600'} fontSize={15} ml={2}> {name} </Heading>
                        <Heading flex={2} color={'red.600'} fontSize={10}> (long press to remove) </Heading>
                    </VStack>
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