/*
* My Sensors functions. 
*/

/** @summary Create a String/MS packet. 
 *  @desc Create a String/MS packet. 
 *  @param {string} destination - the node that will recieve this message. 
 *  @param {string} sensor - the sensor on that node.
 *  @param {string} command - which internal type. See mymessage.js.
 *  @param {string} acknowledge - ack. 0 or 1.
 *  @param {string} type - see mymessage.js.
 *  @param {string} payload -the payload of the message.
 *  @returns {string} msg - a MySensors packet.
 */
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

/** Send a MySensors packet over the serial port. .  
 * @param {string} _msg - The MS Packet.
*/
function ms_write_msg(_msg){
  port.write(_msg);
}

/** Send the config to a sensor.  
 * @param {number} _nodeid - The id to send the config too.
*/
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

/** Send the time to a sensor.  
 * @param {number} _nodeid - The id to send the time too.
*/
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

/** A proper mysensors packet has been recieved.  
 * @param {object} _data - a mysensors packet.
*/
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
        dbutils.save_node_version(nodeid,payload.trim());
      }
      else if (childsensorid != BROADCAST_ADDRESS){
        dbutils.save_sensor(nodeid, childsensorid, payload,subtype);
      }
      else {
        // uncaught presentation. Im not perfect ok.
        logUtils.log('something weird?: ' + _data);
      } 
      break;

    case C_SET:
      // this is a bug, motor controllers broadcast as 0 at first for some reason. 
      if (childsensorid == "0" || nodeid == "0") break;
      dbutils.save_sensor_value(nodeid, childsensorid, subtype, payload);
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
          dbutils.save_node_battery_level(nodeid,payload);
          break;
          
        // Sensor is requesting time. 
        case I_TIME:
          ms_sendtime(nodeid);
          break;
          
        case I_ID_REQUEST:
          logUtils.mslog('ID request.');
          if ( inclusion_mode == true ){ dbutils.sendNextAvailableSensorId(); }
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
          dbutils.save_node_name(nodeid, payload);
          break;
        case I_SKETCH_VERSION:
          if (nodeid == "0") break;
          dbutils.save_node_lib_version(nodeid,payload);
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

// Inclusion mode toggler. This can be forced anywhere in the program it not bound to the Gateway. 
function toggle_inclusion_mode(toggle){
  // Set to true or false accordingly. 
  if(toggle === 1){
    logUtils.mslog('Entering inclusion mode.');
    global.inclusion_mode = true;
    
  } else if( toggle === 0 ){
    logUtils.mslog('Exiting inclusion mode.');
    global.inclusion_mode = false;
  }
}
module.exports = {
    packet_recieved : packet_recieved,
    ms_encode       : ms_encode,
    ms_write_msg    : ms_write_msg,
    ms_sendconfig   : ms_sendconfig,
    ms_sendtime     : ms_sendtime,
    toggle_inclusion_mode : toggle_inclusion_mode
}