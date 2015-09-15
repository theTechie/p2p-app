/**
 * Created by gags on 12/9/15.
 */
var Server = require('socket.io'),
    io = new Server(),
    HashTable = require('hashtable'),
    hashtable = new HashTable();

var PORT = 3000;

io.on('connect', function (socket) {
    logMessage("Client Connected : " + socket.handshake.address);
    socket.emit('init', "Welcome to P2P Index Server !");

    socket.on('register', function (response) {
        registerPeer(socket.id, response.files, response.ip_port);
    });

    socket.on('lookup', function (response) {
        logMessage("File Requested -> " + response.fileName);

        var peerList = lookupFile(response.fileName);
        socket.emit('peerList', { peerList: peerList, fileName: response.fileName });
    });

    socket.on('event', function (data) {
        logMessage("Event: " + data);
    });

    socket.on('disconnect', function () {
        deregisterPeer(socket.id);
        logMessage("Client Disconnected ! ");
    });
});

function registerPeer(peerId, files, ip_port) {
    var peerInfo = {};
    /* This is hardly happen as registering a peer is always 1 time*/
    if (hashtable.has(peerId)) {
        peerInfo = hashtable.get(peerId);
    }

    peerInfo.files = files;
    peerInfo.ip_port = ip_port;
    hashtable.put(peerId, peerInfo);

    logMessage("Messages Registered : " + hashtable.size());
    files.forEach(function (file, i) {
        console.log("files registered : ", file);
    });
}

function deregisterPeer(peerId) {
    if (hashtable.has(peerId)) {
        hashtable.remove(peerId);
    }
}

/* Search for fileName across peers */
function lookupFile(fileName) {
    var peerList = [];
    hashtable.forEach(function (key, value) {
        console.log("lookup file : ",  value);
        if (value.files.indexOf(fileName) != -1) {
            peerList.push({ peer: value.ip_port });
        }
    });
    return peerList;
}

function logMessage(message) {
    console.log("[Index Server] : ", message);
}

io.listen(PORT);
console.log("Index Server Running at : http://localhost:" + PORT);
