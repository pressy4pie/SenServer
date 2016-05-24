var mqtt = require('mqtt');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var MongoClient = require('mongodb').MongoClient;
var vm = require('vm');
var fs = require('fs');

// Something that should be got from our non existant configuration file. 
var node_dead_milis = 900000; //15 minutes
//var node_dead_milis = 90;

// Get the mymessage variables because i dont wan't it in this file. its a huge list. 
var includeInThisContext = function(path) {
    var code = fs.readFileSync(path);
    vm.runInThisContext(code, path);
}.bind(this);
includeInThisContext(__dirname+"/mymessage.js");

// Set some initial variables. 
const cloud_mqtt_server = "10.0.0.134:3002";
const local_mqtt_server = "localhost:3003";
const serial_number = process.env.SERIALNUM;

// These will need to be set pragmatically. 
const net_connection = true;
var inclusion_mode = true;

// Initialize db connection.
var dburl = 'mongodb://localhost:27017/'+serial_number;
MongoClient.connect(dburl, function(err, db) {
  if(err)
    throw err;
  console.log("Connected to DB.");
  db.createCollection('nodes', function(err, collection) { });
  db.createCollection('sensors', function(err, collection) { });
  
  // These are our two collections for mysensors messages. 
  nodeCollection = db.collection('nodes');
  sensorCollection = db.collection('sensors');
  
  // This stuff doesn't work yet. 
  alarmCollection = db.collection('alarms');
  timerCollection = db.collection('timers');
});

// Initialize the serial port. 
var port = new SerialPort("/dev/ttyACM0", {
  baudrate: 115200,
  parser: serialport.parsers.readline('\n')
}); 

// Successful serial port open. 
port.on('open', function () {
  console.log('Serial port opened.');
});

// Check for internet and open a mqtt websocket.
if (net_connection){
  var mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
}
else {
  // Start the local mqtt server. 
  var http = require('http');
  var mosca = require('mosca');
  var conf = require('./app/config');
  
  var moscaSettings = {
  port: conf.mqttPort,
  http: { // for teh websockets
      port: conf.httpPort,
      bundle: true,
      static: './frontend'
    }
  };
  
  var server = new mosca.Server(moscaSettings);   //here we start mosca
  
    server.on('ready', function() {
    console.log("Server online");
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
  var mqtt_client = mqtt.connect("ws:" + local_mqtt_server, {});
}

    

// Encode a mysensors message. 
function ms_encode(destination, sensor, command, acknowledge, type, payload) {
	var msg = destination.toString(10) + ";" + sensor.toString(10) + ";" + command.toString(10) + ";" + acknowledge.toString(10) + ";" + type.toString(10) + ";";
	if (command == 4) {
		for (var i = 0; i < payload.length; i++) {
			if (payload[i] < 16)
				msg += "0";
			msg += payload[i].toString(16);
		}
	} else {
		msg += payload;
	}
	msg += '\n';
	return msg.toString();
}

// Send a message to the gateway. Do i really need this?
function ms_write_msg(_msg){
  port.write(_msg);
}

/* these obviously don't right work yet.*/
function start_node_checker(){
  var node_check_frequency = 10000; //ten seconds. In production this will be like 15 minutes.
  var node_checker_id = setInterval(check_node_alive, node_check_frequency);
}

function check_node_alive(){
  num_nodes = nodeCollection.count();
  num_nodes.then(function(value){ 
        for(var i=1; i <= parseInt(value); i++){
        
        thisNode = nodeCollection.find( { _id: parseInt(i) }).toArray();
        thisNode.then(function( node_to_check ){

          // Create a string to work with. 
          node_to_check_str = JSON.stringify(node_to_check);
          // Get rid of the brackets. 
          node_to_check_str = node_to_check_str.replace(/[\[\]']+/g,'');
          
          // Convert it back. Thanks mongodb.
          var node_json = JSON.parse(node_to_check_str);
          
          // If node hasnt been seen in the node_dead_milis 
          if( (Date.now() - node_json.last_seen) > node_dead_milis && node_json.alive == true){
            console.log('node: '  + node_json._id + " is declared dead."); 
            nodeCollection.update( {'_id' : parseInt(node_json._id)}, {$set: {'alive': false}} );
          }
          });
    }
  });
}

// Save a timer in the DB.
function save_timer(){
  
}

// Save an alarm in the DB.
function save_alarm(){
  
}

// This is usually a callback from other save_xx whatever. 
function save_timestamp(_nodeid){
  // Save the last seen time.
  nodeCollection.update( {'_id': _nodeid}, { $set: {'last_seen' : Date.now() } } );
  // Obviously if we just updated time, we are alive lol.
  nodeCollection.update( {'_id': _nodeid}, { $set: {'alive' : true } } );
}


// Save the sensor in the DB
function save_sensor(_nodeid, sensor_id, sensor_name, sensor_subtype){
  console.log('saving new sensor on node: ' + _nodeid);
  
  // Build the json thats going to be used for the document and save it.
  newSensor = { '_id': _nodeid+ "-" + sensor_id, 'node_id':_nodeid, 'sensor_id': sensor_id, 'sensor_name': sensor_name, 'sensor_type': sensor_subtype,'variables':{} };
  sensorCollection.save(newSensor);
  save_timestamp(_nodeid);
}

// Save the sensor state to teh db 
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  // This will be our document to update as saved above.
  thisSensor = sensorCollection.find( { _id: _nodeid + "-" + sensor_id} ).toArray();
  // When it is populated by mongodb (not promise {<pending>})
  thisSensor.then(function( sensor_to_publish ){
    // change the array to a string, remove the brackets, and change it back to a json. 
    var sensor_to_publish_str = JSON.stringify(sensor_to_publish);
    sensor_to_publish_str = sensor_to_publish_str.substring(1, sensor_to_publish_str.length-1);
    var sensor_to_publish_obj = JSON.parse(sensor_to_publish_str);
    
    // Save the new sensor variable and update it in db. 
    sensor_to_publish_obj.variables[sensor_type] = payload
    sensorCollection.update( { _id: _nodeid + "-" + sensor_id }, sensor_to_publish_obj );
  }); 

  // Save timestamp, and update the state in mqtt. 
  save_timestamp(_nodeid);
  publish_nodes();
}

// Save the node version in the db.
function save_node_version(_nodeid,version){
  nodeCollection.update( {'_id': _nodeid}, { $set: {'node_version' : version} } );
  save_timestamp(_nodeid);
}

// save library version in db.
function save_node_lib_version(_nodeid,libversion){
  nodeCollection.update( {'_id': _nodeid}, { $set: {'lib_version' : libversion} } );
  save_timestamp(_nodeid);
}

// Save teh node battery level in db. 
function save_node_battery_level(_nodeid,bat_level){
  nodeCollection.update( {'_id': _nodeid}, { $set: {'bat_level' : parseInt(bat_level)} } );
  save_timestamp(_nodeid);
}

// save node name in db. 
function save_node_name(_nodeid,node_name){
  console.log('saveing node name')
  nodeCollection.update( {'_id': _nodeid}, { $set: {'node_name' : node_name} } );
  save_timestamp(_nodeid);
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  //Start with 1 for good measure. 
  num_nodes = nodeCollection.count();
  num_nodes.then(function(value){ 
    console.log(value);
    
      
    nid =  (parseInt(value) + 1 ); 
    console.log(nid);
    
    //Build a blank node.
    var empty_node = { '_id' : nid,
                      'bat_level' : null,
                      'node_name' : null,
                      'node_version' : null,
                      'lib_version' : null,
                      'last_seen' : Date.now(), 
                      'alive' : 'true'
                    };
    nodeCollection.save(empty_node);
    
    // send the id to the node itself. 
    var msg = ms_encode(BROADCAST_ADDRESS, NODE_SENSOR_ID, C_INTERNAL, "0", I_ID_RESPONSE, nid);
    ms_write_msg(msg);
    save_timestamp(nid);
    
    // Got an update, update in mqtt.
    publish_nodes();
    
  } );
}

// Init.
function publish_all(){
  console.log('publishing all.');
  publish_nodes();
  publish_alarms();
  publish_timers();
}

// publish our nodes. 
function publish_nodes(){
  
    // Number of nodes
    num_nodes = nodeCollection.count();
    num_nodes.then(function(value){ 
      // For every node, publish a json about it.     
      for(var i=1; i <= parseInt(value); i++){
        thisNode = nodeCollection.find( { _id: parseInt(i) }).toArray();
        thisNode.then(function( node_to_publish ){
          // Create a string to work with. 
          node_to_publish_str = JSON.stringify(node_to_publish);
          // Get rid of the brackets. 
          node_to_publish_str = node_to_publish_str.replace(/[\[\]']+/g,'');
          
          // Convert it back. Thanks mongodb.
          var node_json = JSON.parse(node_to_publish_str);
          var node_id = node_json['_id'];
          
          /* 
          *
          * ToDo add sensors to the node json before publish.
          * 
          */
          
          //node_sensors = sensorCollection.find({'node_id': node_id}).toArray();
          //console.log(node_sensors);
          
          // Do the publish. 
          mqtt_client.publish("/zc/" + serial_number + "/node/", JSON.stringify(node_json) );
          });
    }
  });
}

// publish our alarms.
function publish_alarms(){
  //not working
  mqtt_client.publish("/zc/" + serial_number + "/alarm/", JSON.stringify('{test:"test"}') );
}

// publish our nodes.
function publish_timers(){
  // not working. 
  mqtt_client.publish("/zc/" + serial_number + "/timer/", JSON.stringify('{test:"test"}') );
}

// Get a json of a particular node. 
function get_node_details(node_id){
  // Build a json of the details for the node 
  var node_json = nodetotrack[node_id]
  return JSON.stringify(node_json);
}

// get a json list of alarms. 
function get_alarm_list(){
  var alarm_list = {}
  mqtt_client.publish('/zc/' + serial_number + '/api/alarm/alarm_list/', JSON.stringify(alarm_list));
}

// get a json list of timers.
function get_timer_list(){
  var timer_list = {}
  mqtt_client.publish('/zc/' + serial_number + '/api/timer/timer_list/', JSON.stringify(timer_list));
}

// Send a config to the sensors. (Imperial or Metric.)
function ms_sendconfig(_nodeid){
  // Imperial for now.
  var payload = "I";
  var sensor = NODE_SENSOR_ID;
  var destination = _nodeid;
  var ack = 0;
  var messagetype = C_INTERNAL;
  var subtype = I_CONFIG;
  
  var message = ms_encode(destination,sensor,messagetype,ack,subtype,payload);
  ms_write_msg(message);
}

// Callback. Decide what do do with the mysensors packet. 
// I call this the 'swich statement from hell'
function packet_recieved(_data){
  // Split the raw data by semicolon.
  var packet = _data.toString().trim().split(";");
  
  var nodeid = parseInt(packet[0]);
  var childsensorid = parseInt(packet[1]);
  var messagetype = parseInt(packet[2]);
  var ack = parseInt(packet[3]);
  var subtype = parseInt(packet[4]);
  var payload = packet[5]; //This is a string most of the time..
  
  // Which type of message?
  switch (parseInt(messagetype)) {
    case C_PRESENTATION:
      // this is a bug, motor controllers broadcast as 0 at first for some reason. 
      if (childsensorid == "0" || nodeid == "0") break;
      
      // presentation is on broadcast address.
      if (childsensorid == BROADCAST_ADDRESS){
        // The version of the sensor. 
        save_node_version(nodeid,payload.trim());
        //console.log("NODE: " + nodeid + " VERSION: "  + payload.trim() );
      }
      else if (childsensorid != BROADCAST_ADDRESS){
        save_sensor(nodeid, childsensorid, payload,subtype);
        //console.log("NODE: " + nodeid + " SENSOR: " + childsensorid + " NAME: " + payload.trim() );      
      }
      else {
        // uncaught presentation. Im not perfect ok.
        console.log('something weird?: ' + _data);
      } 
      break;

    case C_SET:
      // this is a bug, motor controllers broadcast as 0 at first for some reason. 
      if (childsensorid == "0" || nodeid == "0") break;
      
      // Print the info.
      //console.log("NODE: " + nodeid + " SENSOR: " + childsensorid + " TYPE: " + subtype + " PAYLOAD: " + payload.trim() );
      save_sensor_value(nodeid, childsensorid, subtype, payload);
      break;

    case C_REQ:
      console.log('C_REQ message');
      break;
      
    case C_INTERNAL:
    if (childsensorid == "0" || nodeid == "0") break;
      switch(parseInt(subtype)){
        
        // The sensors battery has been updated.                  
        case I_BATTERY_LEVEL:
          console.log("NODE: " + nodeid + " BATTERY: " + payload.trim() + "\%");
          save_node_battery_level(nodeid,payload);
          break;
          
        // Sensor is requesting time. 
        case I_TIME:
          break;
          
        case I_ID_REQUEST:
          console.log('id request');
          if (inclusion_mode == true){
            sendNextAvailableSensorId();
          }
          break;  
          
        // Trigger inclusion_mode for a while
        case I_INCLUSION_MODE:
          console.log('entering inclusion mode.');
          break;
          
        // Send the config to the node.   
        case I_CONFIG:
          ms_sendconfig(nodeid);
          break;
          
        // We dont use this but we could. 
        case I_LOG_MESSAGE:
          if (nodeid == "0") break;
          console.log("LOG MESSAGE FROM: " + nodeid + " MESSAGE: " + payload.trim() );
          break;
          
        // Node name and version. 
        case I_SKETCH_NAME:
          save_node_name(nodeid, payload);
          break;
        case I_SKETCH_VERSION:
          save_node_lib_version(nodeid,payload);
          break;
          
        // The gateway is ready. 
        case I_GATEWAY_READY:
          console.log("Serial Gateway Ready.");
          break;
          
        // i know the heartbeat is usefull but not using it yet. 
        case I_HEARTBEAT:
          console.log('heartbeat: ' + _data);
          break;
        case I_HEARTBEAT_RESPONSE:
          console.log('heartbeat Response: ' + _data);
          break;
        
        // I dont think we use the rest of these in tis situation.   
        case I_PRESENTATION:
          console.log('presentation message: '+ _data);
          break;
          
        // We don't use any of these. 
        case I_VERSION:
        break;
        case I_ID_RESPONSE:
        break;  
        case I_FIND_PARENT:
        break;
        case I_FIND_PARENT_RESPONSE:
        break;  
        case I_CHILDREN:
        break;
        case I_SIGNING_PRESENTATION:
        break;
        case I_NONCE_REQUEST:
        break;
        case I_NONCE_RESPONSE:
        break;
        case I_REBOOT:
        break;
        case I_CHANNEL:
        break;
        case I_LOCKED:
        break;  
        case I_DISCOVER:
        break;
        case I_DISCOVER_RESPONSE:
        break; 
      }
      break;
      
    case C_STREAM:
      console.log('C_STREAM message');
      switch(parseInt(subtype)){
        case ST_FIRMWARE_CONFIG_REQUEST:
          break; 
        case ST_FIRMWARE_CONFIG_RESPONSE:
          break;
        case ST_FIRMWARE_REQUEST:
          break;
        case ST_FIRMWARE_RESPONSE:
          break;
        case ST_SOUND:
          break;
        case ST_IMAGE:
          break;
        } 
      break;
  }
}

// Subscribe to our serial number. 
// Eventually we will need auth for this. 
mqtt_client.subscribe('/zc/' + serial_number + "/#");
console.log('subscribed to: ' + '/zc/' + serial_number);


// Successful connection to mqtt. 
mqtt_client.on('connect', () => {  
  console.log('Connected to mqtt.');
  start_node_checker();
})


// When the serial port gets data. 
port.on('data', function (data) {
  // Print the serial message.
  if(data.match(/;/g).length == 5 ){ 
    // A valid mymessage
    // Publish the raw message to mqtt for fun.
    mqtt_client.publish('/zc/' + serial_number + '/debug/raw_ms_msg',data);
    packet_recieved(data);
  }
  else{
    // Not a real mysensors message. Not sure how you got here.
    console.log('UNRECOGNIZED MESSAGE');
  }
});

// When mqtt gets a message.
mqtt_client.on('message', function (topic, message) {
  switch (topic){
    
    // If its a plain subscription to the base level, publish all nodes,alarms,timers etc.
    case '/zc/' + serial_number + "/":
      console.log('new connection');
      publish_all();
      break;
   
   // This is just a test that i use for stuff.    
    case '/zc/' + serial_number + "/test/":
      check_node_alive();
      break;
    
    // Specific api parts.
    case '/zc/' + serial_number + '/get_nodes/':
      console.log('publishing nodes.');
      publish_nodes();
      break;
      
    // Update a variable.
    case '/zc/' + serial_number + '/update_sensor_variable/':
      msg_json = JSON.parse(message.toString());
      msg = ms_encode(msg_json['node_id'], msg_json['sensor_id'], msg_json['msg_cmd'], 0, msg_json['msg_type'], msg_json['payload'] );
      ms_write_msg(msg);
      break; 
      
    // Create a new timer. 
    case '/zc/' + serial_number + '/create_timer/':
      msg_json = JSON.parse(message.toString());
      save_timer();
      break;
    
    // Create an alarm. 
    case '/zc/' + serial_number + '/create_alarm/':
      msg_json = JSON.parse(message.toString());
      save_alarm();
      break;
      
    // Publish timers.
    case '/zc' + serial_number + '/get_timers/':
      publish_timers();
      break;
    // Publish alarms. 
    case '/zc' + serial_number + '/get_alarms/':
      publish_alarms();
      break;
      
    // Other stuff.
    case '/zc/' + serial_number + '/debug/raw_ms_msg':
      //nothing of interest.
      break;
    // Print the message if it doesnt match anything else. 
    default:
      //console.log([topic, message].join(": "));
      break;
  }
});