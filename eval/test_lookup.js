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
var filesToSearch = [];

function onConnect(message) {
    logMessage("Connected to Index Server !");
}

socket.on('init', function (message) {
    logMessage(message);
    filesToSearch = ['file_1k_p1','file_2k_p2','file_3k_p3','file_4k_p1','file_5k_p2','file_6k_p3','file_7k_p1','file_8k_p2','file_9k_p3', 'file_10k_p3'];
    testLookup();
});

function testLookup() {
    iteration++;
    if (iteration < maxIteration) {
        var toSearch = filesToSearch[Math.floor(Math.random() * filesToSearch.length)];
        lookupFile(toSearch);
    } else {
        console.log("Lookup Latency / Lookup (ms) : ", totalLatency / maxIteration);
        process.exit();
    }
}

function lookupFile(fileName) {
    socket.emit('lookup', { fileName : fileName, timestamp: Date.now() });
}

socket.on('peerList', function (response) {
    var latency = Date.now() - response.timestamp;
    console.log("Lookup Latency : ", latency);
    totalLatency += latency;
    testLookup();
});

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