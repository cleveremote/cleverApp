import { AlertDialog, Button } from "native-base";
import React from "react";

export function ModalConfirmation({ isOpen, onClose, onDelete }: { isOpen: boolean, onClose: () => void, onDelete: () => void }) {
    const cancelRef = React.useRef(null);
    return (<AlertDialog leastDestructiveRef={cancelRef} isOpen={isOpen} onClose={onClose}>
        <AlertDialog.Content>
            <AlertDialog.CloseButton />
            <AlertDialog.Header>Delete Cycle</AlertDialog.Header>
            <AlertDialog.Body>
                This will remove the cycle. This action cannot be
                reversed. Deleted data can not be recovered.
            </AlertDialog.Body>
            <AlertDialog.Footer>
                <Button.Group space={2}>
                    <Button variant="unstyled" colorScheme="coolGray" onPress={onClose} ref={cancelRef}>
                        Cancel
                    </Button>
                    <Button colorScheme="danger" onPress={onDelete}>
                        Delete
                    </Button>
                </Button.Group>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog>);
}