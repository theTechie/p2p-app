/**
 * Created by gags on 12/9/15.
 */
var inquirer = require('inquirer'),
    io = require('socket.io-client'),
    fs = require('fs'),
    path = require('path'),
    ip = require('ip'),
    ss = require('socket.io-stream'),
    Server = require('socket.io'),
    ioServer = new Server(),
    socket = io('http://localhost:3000');

var argv = require('optimist')
    .usage('Usage: $0 -f [FILES] -p [PORT]')
    .demand(['f', 'p'])
    .alias('f', 'folder')
    .describe('f', 'Folder with files to register')
    .alias('p', 'port')
    .describe('p', 'Port to run on')
    .argv;

var folderName = argv.folder;

var files = [];

fs.readdir(folderName, function (err, list) {
    if (err) {
        console.log("Please provide a valid folder name !");
        process.exit();
    } else {
        list.forEach(function (file, i) {
            files.push(file);
        });

        socket.on('connect', onConnect);
    }
});

function onConnect(message) {
    logMessage("Connected to Index Server !");
    registerPeer(files, argv.port);
}

socket.on('init', function (message) {
    logMessage(message);
    promptForFileName();
});

function promptForFileName() {
    var requestForFileName = [{
        type: "input",
        name: "fileName",
        message: "Please enter the filename you want to search for : ",
        validate: function (input) {
            if (input === undefined || input === '' || input.trim() === '') {
                console.log("Please enter proper filename !");
                return false;
            } else {
                return true;
            }
        }
    }];

    inquirer.prompt(requestForFileName, function( response ) {
        lookupFile(response.fileName);
    });
}

function registerPeer(files, port) {
    socket.emit('register', { files : files, ip_port: ip.address() + ":" + port });
}

function lookupFile(fileName) {
    socket.emit('lookup', { fileName : fileName });
}

socket.on('peerList', function (response) {
    console.log("peerList: ", response);
    promptForPeerSelection(response.peerList, response.fileName);
});

function promptForPeerSelection(peerList, fileName) {
    peerList = peerList.map(function(peer, i) { return peer.peer; });

    var requestForPeerSelection = [{
        type: "list",
        name: "peer",
        message: "Please select the peer you want to download from : ",
        choices: peerList
    }];

    /* Prompt again if file was not found */
    if (peerList.length > 0) {
        inquirer.prompt(requestForPeerSelection, function( response ) {
            console.log(response);
            downloadFile(response.peer, fileName);
            // Emit to a specific peer (how to traget to a peer ?)
            //socket.emit('obtain', { fileName: response.fileName });
        });
    } else {
        logMessage("Sorry, could not locate the file requested in any of the peers !");
        promptForFileName();
    }
}

function downloadFile(peer, fileName) {
    var ioClient = io('http://' + peer, { 'forceNew': true });
    console.log("connecting to peer : ", 'http://' + peer);

    ioClient.on('connect', function () {
        console.log("Connect to required peer for download !");

        ioClient.emit('obtain', { fileName: fileName });
    });

    ioClient.on('disconnect', function () {
        console.log("Download Complete. Disconnecting Peer !");
    });

    ss(ioClient).on('download', function (stream, data) {
        var filename = path.basename(data.name);
        stream.pipe(fs.createWriteStream(__dirname + '/files/' + filename));

        stream.on('end', function () {
            console.log("File Downloaded !");
            ioClient.disconnect();
            promptForFileName();
        });
    });
}

ioServer.on('connect', function (socket) {
    logMessage("Connected to Peer : " + socket.id);

    socket.on('obtain', function (response) {
        var stream = ss.createStream();
        ss(socket).emit('download', stream, { name: response.fileName });
        fs.createReadStream(__dirname + '/files/' + response.fileName).pipe(stream);
    });
});

socket.on('event', function (data) {
    logMessage("Event: " + data);
});

socket.on('disconnect', function () {
    logMessage("Index Server Went Down !");
});

function logMessage(message) {
    console.log("[Client] : ", message);
}

ioServer.listen(argv.port);
