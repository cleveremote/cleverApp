import IO from 'socket.io-client';

/** socket configurations */
const socket = IO('http://127.0.0.1:5001', {
    forceNew: true,
});
socket.on('connection', () => //console.log('Connection'));
socket.on('greeting-from-server', function (message) {

    //console.log('Connection');
});

export const sendMessage = () => async dispatch => {
    socket.emit('sendMessage', { name: 'test1234' }, callback => { });
};