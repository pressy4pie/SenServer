var mqtt = require('mqtt');
var SerialPort = require("serialport").SerialPort;
var mysql = require("mysql");

const cloud_mqtt_server = "10.0.0.134:3002";
const local_mqtt_server = "localhost:3002";
const serial_number = "process.env.SERIALNUM";
const net_connection = true;

// Initialize the serial port. 
var serialPort = new SerialPort("/dev/ttyUSB0", {
  baudrate: 115200
}); 

// First you need to create a connection to the db
var sql_con = mysql.createConnection({
  host: "localhost",
  user: "user",
  password: "pass"
});

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

if (net_connection){
  var mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
}
else {
  var mqtt_client = mqtt.connect("ws:" + local_mqtt_server, {});
}

// Subscribe to our serial number. 
// Eventually we will need auth for this. 
mqtt_client.subscribe(serial_number);

function gets(topic, payload){
  console.log([topic, payload].join(": "))
  if(payload == 'test'){console.log("tortillas")}
  if(payload == 'ack'){
    mqtt_client.publish(topic, "response");
    console.log('YOU SENT THE THING!!!!11!!1!!!');
  }
  
}
