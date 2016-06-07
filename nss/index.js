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

//This should only happen if there is no internet. 
var start_local_broker = function(){
  global.mosca = require('mosca');
  global.http = require('http');
  var moscaSettings = {
    port: 1883,
    http: { // for teh websockets
      port: 3002,
      bundle: true,
      static: ''
    }
  };
  global.mqtt_broker = new mosca.Server(moscaSettings);
  mqtt_broker.on('ready', function() {
    logUtils.mqttlog("Local broker online");
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
    global.dburl = 'mongodb://10.0.0.134:27017/'+serial_number;
    global.cloud_mqtt_server = "ekg.westus.cloudapp.azure.com:3002";
    global.mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
  }
  else {
    cloud_mqtt_server
    global.dburl = 'mongodb://' + '10.0.0.134' +':27017/' + serial_number;
    global.local_mqtt_server = "localhost:3002";
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
  global.cloud_mqtt_server = "ekg.westus.cloudapp.azure.com:3002";
  global.local_mqtt_server = "localhost:3002";
  global.serial_port = '/dev/ttyACM0';
  global.dburl = 'mongodb://localhost:27017/'+serial_number;
  start_local_broker(); // Just to make sure it works.
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

// Initialize db connection.]
MongoClient.connect(dburl, function(err, db) {
  if(err){
    logUtils.errlog("Could not connect to Database Server. Not running?");
    
    throw err;
  }

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
global.port = new SerialPort(serial_port, {
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
  mqtt_client.subscribe('/updates/#');
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
    logUtils.log('UNRECOGNIZED MESSAGE: ' + data);
  }
});

mqtt_client.on('message', function (topic, message) {
  switch (topic){
    /** When an app connects it should publish something to here. 
     *  That something can be anything. a message that says 'connect' is easy to find in logs. */
    case '/zc/' + serial_number + "/":
      logUtils.mqttlog('new connection');
      mqttUtils.publish_all();
      mqtt_client.publish('/zc/' + serial_number + "/get_current_inclusion_mode/",'get');
      break;

      /** INCLUSION MODE STUFF */
    
    /** Turn Inclusion mode on for 30 seconds. 
     *  The message can be anything, but 'set' is easy to find in the logs. */   
    case '/zc/' + serial_number + "/set_inclusion_mode/":
      myspacket.toggle_inclusion_mode(1);
      mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'on');
      /** Turn in off in 30000. that could probably be a config paramater. */
      setTimeout(function(){ 
        mqtt_client.publish('/zc/' + serial_number + "/stop_inclusion_mode/", '');
      }, 30000);
      break;
    
    /** Force inclusion mode to stop.  
     *  Again the message could be anything. 'set' or something is perfered.  */ 
    case '/zc/' + serial_number + "/stop_inclusion_mode/":
      myspacket.toggle_inclusion_mode(0);
      mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
      break; 
      
    /** Publishes the current inclustion mode 
     *  Message can be anything again. 'get' is nice. */
    case '/zc/' + serial_number + "/get_current_inclusion_mode/":
      if( inclusion_mode == true){
        mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'on');
      } else {
        mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
      }
      break;
           
      /** SENSOR/NODE STUFF */
      
    /** Update a sensor variable. 
     *  Expects an object: {'node_id': NUMBER, 'sensor_id' : NUMBER, 'msg_cmd': NUMBER, 'msg_type' : NUMBER, 'payload': NUMBER } */
    case '/zc/' + serial_number + '/update_sensor_variable/':
      var msg_json = JSON.parse(message.toString());
      var msg = myspacket.ms_encode(msg_json['node_id'], msg_json['sensor_id'], msg_json['msg_cmd'], 0, msg_json['msg_type'], msg_json['payload'] );
      myspacket.ms_write_msg(msg);
      break; 
    
    /** Reboot a node. 
     *  Expects an object: {'node_id' : NUMBER} */
    case '/zc/' + serial_number + '/reboot_node/':
      var msg_json = JSON.parse(message.toString());
      var msg = myspacket.ms_encode(msg_json['node_id'], NODE_SENSOR_ID, C_INTERNAL, NO_ACK, I_REBOOT, '' );
      myspacket.ms_write_msg(msg);      
      break;
      
    /** Update the number of miliseconds until a node is declared dead.
     *  Expects an object: {'node_id' : NUMBER, 'hb_freq' : NUMBER }  */
    case '/zc/' + serial_number + '/update_node_hb_freq/':
      
      break;
    
    /** update node display name. Expects a JSON object. 
     *  Expects an object: {'node_id' : NUMBER, 'displayName' : STRING} */
    case '/zc/' + serial_number + '/update_node_display_name/':
      var msg_json = JSON.parse(message.toString());
      dbutils.update_node_display_name(msg_json['node_id'], msg_json['diaplayName']);
      mqttUtils.publish_nodes();
      break; 
      
    /** Update the number of miliseconds before a node is declared dead. 
     *  Expects an object: {'node_id': NUMBER, 'node_dead_milis': NUMBER} */
    case '/zc/' + serial_number + '/update_node_dead_milis/':
      var msg_json = JSON.parse(message.toString());
      dbutils.update_node_display_name(msg_json['node_id'], msg_json['node_dead_milis']);
      break;
      
    /** update sensor Display name. Expects a JSON object. 
     *  Expects an object: {'node_id' : NUMBER, 'sensor_id' : NUMBER 'displayName' : STRING} */
    case '/zc/' + serial_number + '/update_sensor_display_name/':
      var msg_json = JSON.parse(message.toString());
      dbutils.update_sensor_display_name(msg_json['node_id'], msg_json['sensor_id'], msg_json['displayName']);
      break; 
      
    /** Publishes all the nodes */
    case '/zc/' + serial_number + '/get_nodes/':
      mqttUtils.publish_nodes();
      break;
      
      /** TIMER STUFF */
    
    /** Create a new timer.
     *  expects an object: {}\
     * SUBJECT TO SOME CHANGE */ 
    case '/zc/' + serial_number + '/create_timer/':
      msg_json = JSON.parse(message.toString());
      dbutils.save_timer( msg_json );
      break;

    /** Publish all the timers. 
     *  Message can be anythin. 'get' */
    case '/zc/' + serial_number + '/get_timers/':
      mqttUtils.publish_timers();
      break;
      
      /** TIMER STUFF */
    
    /** Create a new alarm.
     *  Expects an Object */
    case '/zc/' + serial_number + '/create_alarm/':
      msg_json = JSON.parse(message.toString());
      dbutils.save_alarm( msg_json );
      break;

    /** Publish all the alarms.
     *  Message can be anythin. 'get' */
    case '/zc/' + serial_number + '/get_alarms/':
      mqttUtils.publish_alarms();
      break;
      
    case '/updates/':
      logUtils.mqttlog("UPDATE THING");
      break;
    case '/updates/senserver':
      logUtils.mqttlog(message.toString());
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