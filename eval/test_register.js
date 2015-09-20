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
    .usage('Usage: $0 -f [FILES] -s [IP_ADDRESS]')
    .demand(['f', 's'])
    .alias('f', 'folder')
    .describe('f', 'Folder with files to register')
    .alias('s', 'server')
    .describe('s', 'Index Server IP Address with port')
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
var files = [];

var port_start = 50000;

var folderName = argv.folder;

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
    testRegister();
}

function testRegister() {
    iteration++;
    if (iteration < maxIteration) {
        registerPeer(files, port_start);
        port_start++;
    } else {
        console.log("Register Latency / Lookup (ms) : ", totalLatency / maxIteration);
        process.exit();
    }
}

var startTime;

socket.on('readyForLookup', function (message) {
    var latency = Date.now() - startTime;
    console.log("Download Latency : ", latency);
    totalLatency += latency;

    logMessage(message);
    testRegister();
});

function registerPeer(files, port) {
    startTime = Date.now();
    socket.emit('register', { files : files, ip_port: ip.address() + ":" + port });
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