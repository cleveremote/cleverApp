import { AlertDialog, Button, Input } from "native-base";
import React, { useState } from "react";

export function ModalOverrideDuration({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (ms:number) => void }) {
    const cancelRef = React.useRef(null);
    const [text, setText] = useState('');
    return (<AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
        <AlertDialog.Content>
            <AlertDialog.CloseButton />
            <AlertDialog.Header>Override duration</AlertDialog.Header>
            <AlertDialog.Body>
                please enter duration in (ms) to override default sequences duration
                <Input defaultValue={text} onChangeText={newText => setText(newText)}></Input>
            </AlertDialog.Body>
            <AlertDialog.Footer>
                <Button.Group space={2}>
                    <Button variant="unstyled" colorScheme="coolGray" onPress={onClose} ref={cancelRef}>
                        Cancel
                    </Button>
                    <Button colorScheme="info" onPress={()=>onConfirm(Number(text))}>
                        execute
                    </Button>
                </Button.Group>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog>);
}