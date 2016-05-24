var http = require('http');
var mosca = require('mosca');
//var authenticate = require('./app/security/authenticate');
var conf = require('./app/config');

var moscaSettings = {
  port: conf.mqttPort,
  http: { // for teh websockets
    port: conf.httpPort,
    bundle: true,
    static: './frontend'
  }
};

// fired when the mqtt server is ready

var server = new mosca.Server(moscaSettings);   //here we start mosca

server.on('ready', function() {
  console.log("Server online");
//  server.authenticate = authenticate;
});  //on init it fires up setup()
[
  'clientConnected',
  'clientDisconnecting',
  'clientDisconnected',
  'published',
  'subscribed',
  'unsubscribed',
  'error'
].forEach(function(event) {
  server.on(event, function(){
    console.log("" + event + " event.");
  });
});
