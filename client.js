/**
 * Created by gags on 12/9/15.
 */
var inquirer = require('inquirer'),
    io = require('socket.io-client'),
    socket = io('http://localhost:3000');

socket.on('connect', onConnect);

function onConnect(message) {
    logMessage("Connected to Index Server !");
}

socket.on('init', function (message) {
    logMessage(message);
    promptForFileName();
});

function promptForFileName() {
    var requestForFileName = [{
            type: "input",
            name: "fileName",
            message: "Please enter the filename you want to search for : "
    }];

    inquirer.prompt(requestForFileName, function( response ) {
        lookupFile(response.fileName);
    });
}

function lookupFile(fileName) {
    socket.emit('lookup', { fileName : fileName });
}

socket.on('peerList', function (response) {
    promptForPeerSelection(response.peerList);
});

function promptForPeerSelection(peerList) {
    var requestForPeerSelection = [{
        type: "list",
        name: "peer",
        message: "Please select the peer you want to download from : ",
        choices: peerList
    }];

    inquirer.prompt(requestForPeerSelection, function( response ) {
        console.log(response);
    });
}

socket.on('event', function (data) {
    logMessage("Event: " + data);
});

socket.on('disconnect', function () {
    logMessage("Index Server Went Down !");
});

function logMessage(message) {
    console.log("[Client] : ", message);
}