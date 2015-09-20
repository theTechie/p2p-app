/**
 * Created by gags on 12/9/15.
 */
var inquirer = require('inquirer'),
    io = require('socket.io-client'),
    fs = require('fs'),
    path = require('path'),
    ip = require('ip'),
    ss = require('socket.io-stream');

var argv = require('optimist')
    .usage('Usage: $0 -s [IP_ADDRESS]')
    .demand(['s'])
    .alias('s', 'server')
    .describe('s', 'Index Server IP Address')
    .argv;

var socket_address;

if (validateAddress(argv.server)) {
    socket_address = "http://" + argv.server;
} else {
    console.log("Please enter a valid IP address and port ! : [IP_ADDRESS]:[PORT] => ", argv.server);
    process.exit();
}

var socket = io(socket_address);

var iteration = 0;
var maxIteration = 1000;
var totalLatency = 0;
var filesToDownload = [];
var peersToDownloadFrom = [];

function onConnect(message) {
    logMessage("Connected to Index Server !");
}

socket.on('init', function (message) {
    logMessage(message);
    filesToDownload = ['file_1k_p1','file_2k_p2','file_3k_p3','file_4k_p1','file_5k_p2','file_6k_p3','file_7k_p1','file_8k_p2','file_9k_p3', 'file_10k_p3'];
    lookup();
});

function lookup() {
    var toSearch = filesToDownload[Math.floor(Math.random() * filesToDownload.length)];
    console.log("lookup file : ", toSearch);
    lookupFile(toSearch);
}

function lookupFile(fileName) {
    socket.emit('lookup', { fileName : fileName, timestamp: Date.now() });
}

socket.on('peerList', function (response) {
    peersToDownloadFrom = response.peerList;
    testDownload(response.fileName);
});

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

socket.on('disconnect', function () {
    logMessage("Index Server Went Down !");
});

function logMessage(message) {
    console.log("[Client] : ", message);
}

// NOTE: check if address is valid (ip:port)
function validateAddress(entry) {
  var ip_port = entry.split(":");
  var blocks = ip_port[0].split(".");

  if (ip_port.length < 2)
    return false;

  if(blocks.length === 4) {
    return blocks.every(function(block) {
      return parseInt(block,10) >=0 && parseInt(block,10) <= 255;
    });
  }
  return false;
}