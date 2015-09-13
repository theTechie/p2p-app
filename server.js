/**
 * Created by gags on 12/9/15.
 */
var Server = require('socket.io'),
    io = new Server();

var PORT = 3000;

var peerList = ['peer_1', 'peer_2', 'peer_3'];

io.on('connect', function (socket) {
    logMessage("Client Connected : " + socket.id);
    socket.emit('init', "Welcome to P2P Index Server !");

    socket.on('lookup', function (response) {
        logMessage("File Requested -> " + response.fileName);

        socket.emit('peerList', { peerList: peerList });
    });

    socket.on('event', function (data) {
        logMessage("Event: " + data);
    });

    socket.on('disconnect', function () {
        logMessage("Client Disconnected ! ");
    });
});

function logMessage(message) {
    console.log("[Index Server] : ", message);
}

io.listen(PORT);
console.log("Index Server Running at : http://localhost:" + PORT);
