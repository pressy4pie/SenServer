/*
*
* THIS IS MY FIRST JAVASCRIPT PROGRAM DON'T JUDGE, OKAY GUY. 
*
*/

//Environment
var environment = process.env.ENV;
const serial_number = process.env.SERIALNUM;

// Deps.
var mqtt = require('mqtt');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var MongoClient = require('mongodb').MongoClient;
var logUtils = require(__dirname+'/logutils.js');
// This is because I didn't want the contents of mymessage.js in this file. 
var vm = require('vm');
var fs = require('fs');

// Set inclusion mode to false in the start so we don't get undefined errors.
global.inclusion_mode = false;

var net_connection = function( ){
  // Do we have internet? 
  // This obviously does not work yet. 
  return true;
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
  global.serial_port = '/dev/ttyACM0';
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

// Inclusion mode toggler. This can be forced anywhere in the program it not bound to the Gateway. 
function toggle_inclusion_mode(toggle){
  // Set to true or false accordingly. 
  if(toggle === 1){
    logUtils.mslog('Entering inclusion mode.');
    global.inclusion_mode = true;
    mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'on');
    
  } else if( toggle === 0 ){
    logUtils.mslog('Exiting inclusion mode.');
    global.inclusion_mode = false;
    mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'off');
  }
}

// Start the background checker for node aliveness.
function start_node_checker(){
  var node_check_frequency = 10000; //ten seconds. In production this will be like 15 minutes.
  var node_checker_id = setInterval(check_node_alive, node_check_frequency);
}

// Start alarm checker.
function start_alarm_checker(){
  
}

// Start timer checker
function start_timer_checker(){
  
}

// Check if nodes are alive. Will probably rewrite this, not in a for loop.
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
      // I think this is the only math I've done in this entire program. 
      if( (Date.now() - node_json.last_seen) > node_dead_milis && node_json.alive == true){
        logUtils.mslog('node: '  + node_json._id + " is declared dead."); 
        nodeCollection.update( {'_id' : parseInt(node_json._id)}, {$set: {'alive': false}} );
        }
      });
    }
  });
}

/*
* DATABASE THINGS FOR MYSENSORS.
*/

// Save a timer in the DB.
function save_timer(){  
  // NO
}

// Save an alarm in the DB.
function save_alarm( alarm_to_save ){  
  // i quit.
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
logUtils.dblog('Saving new sensor on node: ' , _nodeid);

// Build the json thats going to be used for the document and save it.
nodeCursor = sensorCollection.find( {'node_id' : _nodeid} );
  nodeCursor.each(function (err, doc) {
    if (err) {
      logUtils.err(err);
      return;
    }else if (doc == null){
      logUtils.dblog('Null sensor');
      // don't know whhy i pick up a null node, but oh well.
    }
    newSensor = { '_id': _nodeid + "-" + sensor_id, 'node_id':_nodeid, 'sensor_id': sensor_id, 'sensor_name': sensor_name, 'sensor_type': sensor_subtype,'variables':{} };
  }); 
}

// Save the sensor state to teh db 
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  // This will be our document to update as saved above.
  thisSensorCursor = sensorCollection.find( { _id: _nodeid + "-" + sensor_id} );
  thisSensorCursor.each(function (err, doc){
    if (err){logUtils.err(err);}
    else if (doc == null){}
    else {
      if(doc.variables == null){
        logUtils.dblog('No variables yet.');
      }
    }
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
  logUtils.dblog('saveing node name')
  nodeCollection.update( {'_id': _nodeid}, { $set: {'node_name' : node_name} } );
  save_timestamp(_nodeid);
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  //Start with 1 for good measure. 
  num_nodes = nodeCollection.count();
  num_nodes.then(function(value){      
    nid =  (parseInt(value) + 1 );     
    //Build a blank node.
    var empty_node = { '_id' : nid,
                      'bat_level' : null,
                      'node_name' : null,
                      'node_version' : null,
                      'lib_version' : null,
                      'last_seen' : Date.now(), 
                      'alive' : 'true',
                      'sensors':{}
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

// This gets called when a new app connects to mqtt..
function publish_all(){
  logUtils.mqttlog('publishing all.');
  publish_nodes();
  publish_alarms();
  publish_timers();
}

// publish our nodes. 
function publish_nodes(){
  logUtils.mqttlog('Publishing nodes.');
  
  // Get cursor for nodes with id greater than zero. 
  var nodeCursor = nodeCollection.find( { _id: {$gt: 0}} );
  nodeCursor.each(function (err, doc) {
    if (err) {
      logUtils.err(err);
    } else if ( doc!= null) {
      var node_to_publish = doc;
      mqtt_client.publish("/zc/" + serial_number + "/node/", JSON.stringify(node_to_publish) ); 
      /*
      var sensor_cursor = sensorCollection.find( {node_id : node_to_publish['_id']} );
      sensor_cursor.each(function ( serr, sdoc ){
        if (serr){
          logUtils.err(err);
        } else if (sdoc!= null){
          node_to_publish.sensors[sdoc['sensor_id']] = sdoc;
          logUtils.log(sdoc);
          mqtt_client.publish("/zc/" + serial_number + "/node/", JSON.stringify(node_to_publish) ); 
        }
      });*/
    }   
  }); 
}

// publish our alarms.
function publish_alarms(){
  logUtils.mqttlog('Publishing alarms');
  var test_alarm = 
  {
    _id : 1,
    name : 'when temp is 70 degrees, open sides.', // String of name.
    enabled : true,
    created : 1464378283,    // Fri, 27 May 2016 19:44:43 GMT
    valid_from : 1464378283, // Fri, 27 May 2016 19:44:43 GMT
    valid_thru : 1495914283, // Sat, 27 May 2017 19:44:43 GMT
    delay : 13, // seconds
    notify_email : [ 'bob@test.com' ], //list of emails to notify.
    execute : [{'node_id': 1, 'sensor_id' : 1, 'msg_cmd': 1, 'msg_type' : 29, 'payload': 1 }] // update node id 1, sensor id 1, of type 29, turn it on. 
  };
  
  //not working
  mqtt_client.publish("/zc/" + serial_number + "/alarm/", JSON.stringify(test_alarm) );
}

// publish our nodes.
function publish_timers(){
  logUtils.mqttlog('Publishing timers');
  var test_timer_schedule = 
  {
    _id : 1,
    name : '2:42 daily', // string of timer name.
    enabled : true,
    created : 1464378283,    // Fri, 27 May 2016 19:44:43 GMT
    valid_from : 1464378283, // Fri, 27 May 2016 19:44:43 GMT
    valid_thru : 1495914283, // Sat, 27 May 2017 19:44:43 GMT
    delay : 13, // seconds
    timer_type : 'schedule',
    hour :  14,
    minute : 42,
    execute : [ {} ],
    notify_email : [ 'bob@test.com' ]
  };
  
  var test_timer_cron = 
  {
    _id : 2,
    name : ' every day at 4:05 pm',
    enabled : false,
    created : 1464378283,    // Fri, 27 May 2016 19:44:43 GMT
    valid_from : 1464378283, // Fri, 27 May 2016 19:44:43 GMT
    valid_thru : 1495914283, // Sat, 27 May 2017 19:44:43 GMT
    delay : 43, // seconds
    timer_type : 'cron',
    cron_schedule : '5 4 * * *', // At 04:05 every day.
    execute : [ {'node_id': 1, 'sensor_id' : 1, 'msg_cmd': 1, 'msg_type' : 29, 'payload': 1 }, {'node_id': 2, 'sensor_id' : 1, 'msg_cmd': 1, 'msg_type' : 30, 'payload': 0 } ],
    notify : [ 'bob@email.com', 'joel@joel.com', '5306467193@metropcs.net' ] // list of emails. (can be phone emails.)
  };
  
  // not working. 
  mqtt_client.publish("/zc/" + serial_number + "/timer/", JSON.stringify(test_timer_cron) );
  mqtt_client.publish("/zc/" + serial_number + "/timer/", JSON.stringify(test_timer_schedule) );
}

/*
* My Sensors functions. 
*/

// Encode a mysensors message returned as a string.
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

// Send time to _nodeid
function ms_sendtime(_nodeid){
  // I don't think this is supposed to be in miliseconds.
  var payload = Date.now();
  var sensor = NODE_SENSOR_ID;
  var destination = _nodeid;
  var ack = 0;
  var messagetype = C_INTERNAL;
  var subtype = I_TIME;
  
  // Build the message and send it.
  var message = ms_encode(destination,sensor,messagetype,ack,subtype,payload);
  ms_write_msg(message);
}

// Callback. Decide what do do with the mysensors packet. 
// I call this the 'swich statement from hell'
function packet_recieved(_data){
  // Split the raw data by semicolon.
  var packet = _data.toString().trim().split(";");
  
  // Rip the packet apart by semicolon as noted above.
  var nodeid = parseInt(packet[0]);
  var childsensorid = parseInt(packet[1]);
  var messagetype = parseInt(packet[2]);
  var ack = parseInt(packet[3]);
  var subtype = parseInt(packet[4]);
  var payload = packet[5]; //This is a string most of the time..
  
  // Which type of message?
  switch (parseInt(messagetype)) {
    case C_PRESENTATION:
      // this is a bug, motor controllers broadcast as 0 at first for some reason. Just ignore this..
      if (childsensorid == "0" || nodeid == "0") break;
      
      // presentation is on broadcast address.
      if (childsensorid == BROADCAST_ADDRESS){
        // The version of the sensor. 
        save_node_version(nodeid,payload.trim());
      }
      else if (childsensorid != BROADCAST_ADDRESS){
        save_sensor(nodeid, childsensorid, payload,subtype);
      }
      else {
        // uncaught presentation. Im not perfect ok.
        logUtils.log('something weird?: ' + _data);
      } 
      break;

    case C_SET:
      // this is a bug, motor controllers broadcast as 0 at first for some reason. 
      if (childsensorid == "0" || nodeid == "0") break;
      save_sensor_value(nodeid, childsensorid, subtype, payload);
      break;

    case C_REQ:
      logUtils.mslog('C_REQ message');
      // I think time messages might go in here.
      break;
      
    case C_INTERNAL:
    // Catch that bug in motor controllers.
    //if (childsensorid == "0" || nodeid == "0") break;
      switch(parseInt(subtype)){
        
        // The sensors battery has been updated.                  
        case I_BATTERY_LEVEL:
          save_node_battery_level(nodeid,payload);
          break;
          
        // Sensor is requesting time. 
        case I_TIME:
          ms_sendtime(nodeid);
          break;
          
        case I_ID_REQUEST:
          logUtils.mslog('ID request.');
          if ( inclusion_mode == true ){ sendNextAvailableSensorId(); }
          else logUtils.mslog('NOT IN INCLUSION MODE'); 
          break;
          
        // Trigger inclusion_mode for a while
        case I_INCLUSION_MODE:
          toggle_inclusion_mode(parseInt(payload.trim()));
          break;
          
        // Send the config to the node.   
        case I_CONFIG:
          ms_sendconfig(nodeid);
          break;
          
        // We dont use this but we could. 
        case I_LOG_MESSAGE:
          if (nodeid == "0") break;
          logUtils.mslog("LOG MESSAGE FROM: " + nodeid + " MESSAGE: " + payload.trim() );
          break;
          
        // Node name and version. 
        case I_SKETCH_NAME:
          if (nodeid == "0") break;
          save_node_name(nodeid, payload);
          break;
        case I_SKETCH_VERSION:
          if (nodeid == "0") break;
          save_node_lib_version(nodeid,payload);
          break;
          
        // The gateway is ready. 
        case I_GATEWAY_READY:
          logUtils.mslog("Serial Gateway Ready.");
          global.gateway_ready = true;
          break;
          
        // i know the heartbeat is usefull but not using it yet. 
        case I_HEARTBEAT:
          logUtils.mslog('heartbeat: ' + _data);
          break;
        case I_HEARTBEAT_RESPONSE:
          logUtils.mslog('heartbeat Response: ' + _data);
          break;
        
        // I dont think we use the rest of these in tis situation.   
        case I_PRESENTATION:
          logUtils.mslog('presentation message: '+ _data);
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
      logUtils.mslog('C_STREAM message');
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
/*
* Kick off the rest of the program. 
*/
function init_program(){
  start_node_checker();
  start_alarm_checker();
  start_timer_checker();
}

// Successful connection to mqtt. 
mqtt_client.on('connect', () => {  
  logUtils.mqttlog('Connected to mqtt.');
  // Subscribe to our serial number. 
  // Eventually we will need auth for this. 
  mqtt_client.subscribe('/zc/' + serial_number + "/#");
  logUtils.mqttlog('subscribed to: ' + '/zc/' + serial_number);
  init_program();
});

// When the serial port gets data. 
port.on('data', function (data) {
  if (data == null) return;
  if(data.match(/;/g).length == 5 ){ 
    // A valid mymessage
    // Publish the raw message to mqtt for fun.
    mqtt_client.publish('/zc/' + serial_number + '/debug/raw_ms_msg',data);
    packet_recieved(data);
  }
  else{
    // Not a real mysensors message. Not sure how you got here.
    logUtils.log('UNRECOGNIZED MESSAGE');
  }
});

// When mqtt gets a message.
mqtt_client.on('message', function (topic, message) {
  switch (topic){
    
    // If its a plain subscription to the base level, publish all nodes,alarms,timers etc.
    case '/zc/' + serial_number + "/":
      logUtils.mqttlog('new connection');
      publish_all();
      break;
   
   // This is just a test that i use for stuff.    
    case '/zc/' + serial_number + "/test/":
      break;
      
    /*
    * INCLUSION MODE STUFFS.
    */
    
    // User is able to start and end inclusion_mode with the app. 
    case '/zc/' + serial_number + "/set_inclusion_mode/":
      toggle_inclusion_mode(1);
      mqtt_client.publish('/zc/' + serial_number + "/current_inclusion_mode/", 'on');
      break;
    
    // end inclusion mode. 
    case '/zc/' + serial_number + "/stop_inclusion_mode/":
      toggle_inclusion_mode(0);
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
      
    // Update a variable.
    case '/zc/' + serial_number + '/update_sensor_variable/':
      msg_json = JSON.parse(message.toString());
      msg = ms_encode(msg_json['node_id'], msg_json['sensor_id'], msg_json['msg_cmd'], 0, msg_json['msg_type'], msg_json['payload'] );
      ms_write_msg(msg);
      break; 

    // Publish all the nodes. 
    case '/zc/' + serial_number + '/get_nodes/':
      publish_nodes();
      break;      
      
    /*
    * TIMER STUFFS.
    */ 
    
    // Create a new timer. 
    case '/zc/' + serial_number + '/create_timer/':
      msg_json = JSON.parse(message.toString());
      save_timer();
      break;

    // Publish timers.
    case '/zc/' + serial_number + '/get_timers/':
      publish_timers();
      break;
      
    /*
    * ALARM STUFFS.
    */
    
    // Create an alarm. 
    case '/zc/' + serial_number + '/create_alarm/':
      msg_json = JSON.parse(message.toString());
      save_alarm( msg_json );
      break;

    // Publish alarms. 
    case '/zc/' + serial_number + '/get_alarms/':
      publish_alarms();
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