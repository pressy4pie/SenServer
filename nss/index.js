/** @desc This is the gateway program between our NRF Radios to the cloud.
 *  @summary Very much a work in progress.
 *  @author Connor Rigby
 */
var SenServer;

//Environment
var environment = process.env.ENV;
global.serial_number = process.env.SERIALNUM;

// Deps.
var mqtt = require('mqtt');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var MongoClient = require('mongodb').MongoClient;

global.logUtils = require(__dirname+'/logutils.js');
global.dbutils = require(__dirname+'/dbutils.js');
global.myspacket = require(__dirname+'/mysensors_packet.js');
global.main_init = require(__dirname+'/init.js');
global.mqttUtils = require(__dirname+'/mqttutils.js');

// This is because I didn't want the contents of mymessage.js in this file. 
var vm = require('vm');
var fs = require('fs');

// Set inclusion mode to false in the start so we don't get undefined errors.
global.inclusion_mode = false;

/** Check for internet. I hope this doesn't add too mcuh time to init. */
var net_connection = function( ){
  var options = {
    host: 'ekg.westus.cloudapp.azure.com',
    port: 80,
    path: '/index.html'
  };

  http.get(options, function(res) {
    if (res.statusCode == 200) {
      return true;
    }
  }).on('error', function(e) {
    return false;
  });
}

// Integrety check because I always to set env variables before starting. 
if(environment == null ){ logUtils.log('MISSING ENVIRONMENT. BAILING!1!!1!!11'); process.exit(-1);  } else {
  logUtils.log('ENVIRONMENT: ' + environment); }

// Production environment. 
if( environment == 'prod'  ){
  // Something that should be got from our non existant configuration file. 
  global.node_dead_milis = 900000; //15 minutes
  
  // Check for internet, and if not start our own mqtt server. 
  if (net_connection){
    global.dburl = 'mongodb://localhost:27017/'+serial_number;
    global.cloud_mqtt_server = "ekg.westus.cloudapp.azure.com:3002";
    global.mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
  }
  else {
    // I would like nodejs to launch the mqtt broker right before connecting to it in this case.
    global.dburl = 'mongodb://localhost:27017/'+serial_number;
    global.local_mqtt_server = "localhost:3003";
    global.mqtt_client = mqtt.connect("ws:" + local_mqtt_server, {});
  }
  
  // Serial port. 
  global.serial_port = '/dev/ttyUSB0';
  // This shouldn't be here, but i'll move it l8r bro.
  mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
}
// Development environment.
else if ( environment == 'dev' ){
  // Something that should be got from our non existant configuration file. 
  global.node_dead_milis = 900000; //15 minutes
  
  global.cloud_mqtt_server = "ekg.westus.cloudapp.azure.com:3002";
  global.local_mqtt_server = "localhost:3003";
  global.serial_port = '/dev/ttyACM1';
  global.dburl = 'mongodb://localhost:27017/'+serial_number;
  global.mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
  // See above. 
  mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
}

// Get the mymessage variables because i dont wan't it in this file. its a huge list. 
var includeInThisContext = function(path) {
    var code = fs.readFileSync(path);
    vm.runInThisContext(code, path);
}.bind(this);
includeInThisContext(__dirname+"/mymessage.js");

// Initialize db connection.
MongoClient.connect(dburl, function(err, db) {
  if(err)
    throw err;
  logUtils.dblog("Connected to DB.");
  
  // The collections of documents we deal with. This could probably be more elegant. 
  db.createCollection('nodes', function(err, collection)   { if(err){ logUtils.err(err); } });
  db.createCollection('sensors', function(err, collection) { if(err){ logUtils.err(err); } });
  db.createCollection('alarms', function(err, collection)  { if(err){ logUtils.err(err); } });
  db.createCollection('timers', function(err, collection)  { if(err){ logUtils.err(err); } });
  db.createCollection('config', function(err, collection)  { if(err){ logUtils.err(err); } });
  
  // These are our two collections for mysensors messages. Partially working. 
  nodeCollection = db.collection('nodes');
  sensorCollection = db.collection('sensors');
  
  // This stuff doesn't work yet. 
  alarmCollection = db.collection('alarms');
  timerCollection = db.collection('timers');
  configCollection = db.collection('config');
});

// Initialize the serial port. 
var port = new SerialPort(serial_port, {
  baudrate: 115200,
  parser: serialport.parsers.readline('\n')
}); 

// Successful serial port open. 
port.on('open', function () {
  logUtils.mslog('Serial port opened.');
});

/** This happens when this program makes a successful connection to the MQTT broker. */ 
mqtt_client.on('connect', () => {  
  logUtils.mqttlog('Connected to mqtt.');
  // Subscribe to our serial number. 
  // Eventually we will need auth for this. 
  mqtt_client.subscribe('/zc/' + serial_number + "/#");
  logUtils.mqttlog('subscribed to: ' + '/zc/' + serial_number);
  main_init.init_program();
});

// When the serial port gets data. 
port.on('data', function (data) {
  if (data == null) return;
  var matcher = data.match(/;/g);
  if( matcher!= null && matcher.length == 5 ){ 
    // A valid mymessage
    // Publish the raw message to mqtt for fun.
    mqtt_client.publish('/zc/' + serial_number + '/debug/raw_ms_msg',data);
    myspacket.packet_recieved(data);
  }
  else{
    // Not a real mysensors message. Not sure how you got here.
    logUtils.log('UNRECOGNIZED MESSAGE');
  }
});

mqtt_client.on('message', function (topic, message) {
  switch (topic){
    // If its a plain subscription to the base level, publish all nodes,alarms,timers etc.
    case '/zc/' + serial_number + "/":
      logUtils.mqttlog('new connection');
      mqttUtils.publish_all();
      mqtt_client.publish('/zc/' + serial_number + "/get_current_inclusion_mode/",'get');
      break;
   
   // This is just a test that i use for stuff.    
    case '/zc/' + serial_number + "/test/":
      break;
      
    /*
    * INCLUSION MODE STUFFS.
    */
    
    /** Turn Inclusion mode on for 30 seconds. */   
    case '/zc/' + serial_number + "/set_inclusion_mode/":
      myspacket.toggle_inclusion_mode(1);
      mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'on');
      
      setTimeout(function(){ 
        mqtt_client.publish('/zc/' + serial_number + "/stop_inclusion_mode/", '');
      }, 30000);
      break;
    
    // end inclusion mode. 
    case '/zc/' + serial_number + "/stop_inclusion_mode/":
      myspacket.toggle_inclusion_mode(0);
      mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
      break; 
      
    case '/zc/' + serial_number + "/get_current_inclusion_mode/":
      if( inclusion_mode == true){
        mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'on');
      } else {
        mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
      }
      
      break;     
 
    /*
    * SENSOR STUFFS.
    */
      
    /** Update a sensor variable. */
    case '/zc/' + serial_number + '/update_sensor_variable/':
      msg_json = JSON.parse(message.toString());
      msg = ms_encode(msg_json['node_id'], msg_json['sensor_id'], msg_json['msg_cmd'], 0, msg_json['msg_type'], msg_json['payload'] );
      ms_write_msg(msg);
      break; 

    // Publish all the nodes. 
    case '/zc/' + serial_number + '/get_nodes/':
      mqttUtils.publish_nodes();
      break;      
      
    /*
    * TIMER STUFFS.
    */ 
    
    // Create a new timer. 
    case '/zc/' + serial_number + '/create_timer/':
      msg_json = JSON.parse(message.toString());
      dbUtils.save_timer( msg_json );
      break;

    // Publish timers.
    case '/zc/' + serial_number + '/get_timers/':
      mqttUtils.publish_timers();
      break;
      
    /*
    * ALARM STUFFS.
    */
    
    // Create an alarm. 
    case '/zc/' + serial_number + '/create_alarm/':
      msg_json = JSON.parse(message.toString());
      dbutils.save_alarm( msg_json );
      break;

    // Publish alarms. 
    case '/zc/' + serial_number + '/get_alarms/':
      mqttUtils.publish_alarms();
      break;
      
    /*
    * DEBUG STUFFS. 
    */
    case '/zc/' + serial_number + '/debug/raw_ms_msg/':
      break;
      
    // Print the message if it doesnt match anything else. 
    default:
      break;
  }
});