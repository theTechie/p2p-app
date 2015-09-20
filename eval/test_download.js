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

var iteration = 0;
var maxIteration = 1000;
var totalLatency = 0;
var filesToDownload = [];
var peersToDownloadFrom = [];

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
    //registerPeer(files, argv.port);
}

socket.on('init', function (message) {
    logMessage(message);
    // File Not Found Lookup
    //peersToDownloadFrom = ['file_not_found'];
    //testLookup();
    filesToDownload = ['file_1k_p1','file_2k_p2','file_3k_p3','file_4k_p1','file_5k_p2','file_6k_p3','file_7k_p1','file_8k_p2','file_9k_p3', 'file_10k_p3'];
    lookup();
});

function lookup() {
    var toSearch = filesToDownload[Math.floor(Math.random() * filesToDownload.length)];
    console.log("lookup file : ", toSearch);
    lookupFile(toSearch);
}

function testDownload(fileName) {
    iteration++;
    if (iteration < maxIteration) {
        var toSearch = peersToDownloadFrom[Math.floor(Math.random() * peersToDownloadFrom.length)];
        downloadFile(toSearch.peer, fileName);
    } else {
        console.log("Download Latency / Download (ms) : ", totalLatency / maxIteration);
        process.exit();
    }
}

function registerPeer(files, port) {
    socket.emit('register', { files : files, ip_port: ip.address() + ":" + port });
}

function lookupFile(fileName) {
    socket.emit('lookup', { fileName : fileName, timestamp: Date.now() });
}

socket.on('peerList', function (response) {
    peersToDownloadFrom = response.peerList;
    console.log("Peer List : ", response.peerList);
    testDownload(response.fileName);
});

function downloadFile(peer, fileName) {
    var startTime = Date.now();
    var ioClient = io('http://' + peer, { 'forceNew': true });
    console.log("connecting to peer : ", 'http://' + peer);

    ioClient.on('connect', function () {
        console.log("Connect to required peer for download !");

        ioClient.emit('obtain', { fileName: fileName, timestamp: Date.now() });
    });

    ioClient.on('disconnect', function () {
        console.log("Download Complete. Disconnecting Peer !");
        lookup();
    });

    ss(ioClient).on('download', function (stream, data) {
        var filename = path.basename(data.name);
        stream.pipe(fs.createWriteStream(__dirname + '/files/' + filename));

        stream.on('end', function () {
            var latency = Date.now() - startTime;
            console.log("Download Latency : ", latency);
            totalLatency += latency;

            console.log("File Downloaded !");
            ioClient.disconnect();
        });
    });
}

ioServer.on('connect', function (socket) {
    logMessage("Connected to Peer : " + socket.id);

    socket.on('obtain', function (response) {
        var stream = ss.createStream();
        ss(socket).emit('download', stream, { name: response.fileName, timestamp: response.timestamp });
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
