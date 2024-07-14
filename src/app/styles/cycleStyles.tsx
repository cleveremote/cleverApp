import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    rowItem: {
        marginHorizontal: 10,
        backgroundColor: 'white',
        borderRadius: 3,
        shadowRadius: 3,
    },
    text: {
        color: '#32404e',
        fontSize: 20
    },
    textSequence: {
        color: '#32404e',
        fontSize: 12
    },
    textSequenceDrag: {
        color: 'white',
        fontSize: 12
    },
    textDrag: {
        color: 'white',
        fontSize: 20
    },
    textPriority: {
        color: '#32404e',
        fontSize: 10,
        fontWeight: "bold"
    },
    textPriorityDrag: {
        color: 'white',
        fontSize: 10,
        fontWeight: "bold"
    },

    spinnerTextStyle: {
        color: '#32404e',
        fontSize: 15,
        marginBottom: 50
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
    buttonOpen: {
        backgroundColor: '#F194FF',
    },
    buttonClose: {
        backgroundColor: '#2196F3',
    },
    textStyle: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
    }
});