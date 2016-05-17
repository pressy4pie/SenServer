var mqtt = require('mqtt');
//var SerialPort = require("serialport").SerialPort;
//var mysql = require("mysql");
var mymessage = require("./mymessage.js")

const cloud_mqtt_server = "10.0.0.134:3002";
const local_mqtt_server = "localhost:3002";
const serial_number = "process.env.SERIALNUM";
const net_connection = true;
/*
// Initialize the serial port. 
var serialPort = new SerialPort("/dev/ttyUSB0", {
  baudrate: 115200
}); 
*/
/*
// Create a connection to the db
var sql_con = mysql.createConnection({
  host: "localhost",
  user: "user",
  password: "pass"
});

// Try to connect to the connection
sql_con.connect(function(err){
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});

sql_con.end(function(err) {
  // The connection is terminated gracefully
  // Ensures all previously enqueued queries are still
  // before sending a COM_QUIT packet to the MySQL server.
});
*/
// Check for internet and open a mqtt websocket.
if (net_connection){
  var mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
}
else {
  var mqtt_client = mqtt.connect("ws:" + local_mqtt_server, {});
}

// Subscribe to our serial number. 
// Eventually we will need auth for this. 
mqtt_client.subscribe('/zc/' + serial_number);

mqtt_client.on('connect', () => {  
  console.log('Connected to mqtt.');
})

mqtt_client.on('message', function (topic, message) {
  // message is Buffer
  console.log([topic, message].join(": "));
  
});


