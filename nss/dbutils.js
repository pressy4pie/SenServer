/** 
* DATABASE THINGS FOR MYSENSORS.
* This file needs the most work L o L.
*/

/** Check to see if nodes are alive. This will loop thru all of the nodes in the db.  */
function check_node_alive(){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find().forEach(function (doc, err){
    if(err){logUtils.errlog(err); throw err;}
    // Just for readability.
    var node_json = doc;
    /** hb_freq is a number in miliseconds, that defaults to 15 minutes. This will probably be user configurable. */
    if( (Date.now() - node_json.last_seen ) > node_json.hb_freq && (node_json.alive == true)){
      logUtils.mslog('node: '  + node_json._id + " is declared dead."); 
      last_seen = new Date(node_json.last_seen);
      logUtils.mslog('last seen: ' + last_seen);
      nodeCollection.update( {'_id' : parseInt(node_json._id)}, {$set: {'alive': false}} );
    }
  });
}

// Save a timer in the DB.
function save_timer( timer_to_save ){  
  /** @TODO */
}

// Save an alarm in the DB.
function save_alarm( alarm_to_save ){  
  /** @TODO */
}

/** Save a timestamp and make it apear alive.
 *  @param {number} _nodeid - the node on which this sensor resides.  
 */
function save_timestamp(_nodeid){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).forEach(function (doc){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'last_seen' : Date.now() } });
    if(doc['alive'] != true){
      logUtils.mslog('node ' + _nodeid + " is declared alive!!");
      nodeCollection.update( {'_id': _nodeid}, { $set: {'alive' : true } } );
    }
  });
}

// Save the sensor in the DB
function save_sensor(_nodeid, sensor_id, sensor_name, sensor_subtype){
  if (typeof nodeCollection == 'undefined'){return;}
  sensorCursor = sensorCollection.find( {'_id' : _nodeid + "-" + sensor_id} ).toArray(function (err, results){
    if(results.length < 1){ //If this sensor doesnt exist already.
      logUtils.dblog('Saving new sensor on node: ' + _nodeid);
      /** check to make sure _nodeid is a real node. */
  nodeCursor = nodeCollection.find( {'_id' : _nodeid } ).toArray(function (err, results){
    if(results[0] == null){
      return;
    } 
    else {
      newSensor = { '_id': _nodeid + "-" + sensor_id, 
              'node_id':_nodeid, 
              'sensor_id': sensor_id, 
              'sensor_name': sensor_name, 
              'sensor_display_name' : sensor_name, 
              'sensor_type': sensor_subtype,
             };
      sensorCollection.save(newSensor);
      }
  });}
  });
}

/** Rename a sensor name for user readability.
 *  Similarly to node name, the regular sensor name gets updated on presentation, so if we want a readable name we make a new feild.
 *  @param {number} _nodeid - the node on which this sensor resides.
 *  @param {number} sensor_id - the id on _nodeid whose name to update.
 *  @param {string} new_name - the new name to store. */
function update_sensor_display_name(_nodeid, sensor_id, new_name){
  if (typeof sensorCollection == 'undefined'){return;}
  sensorCursor = sensorCollection.find( {'_id' : _nodeid + "-" + sensor_id} ).toArray(function (err, results){
    sensorCollection.update( {'_id' : _nodeid + "-" + sensor_id}, { $set: {'sensor_display_name' : new_name} });
  });
}

/** Save the sensor to the database
 *  @param {number} _nodeid - The node that holds the sensor.
 *  @param {number} sensor_id - the sensor on that node.
 *  @param {number} sensor_type - the variable type. See mymessage.js.
 *  @param {string} payload - the payload to update. */
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  if (typeof sensorCollection == 'undefined'){return;}
  sensorCursor = sensorCollection.find( {'_id' : _nodeid + "-" + sensor_id} ).toArray(function (err, results){
    if(results[0] == null){
      return;
    }
    if(results[0]['variables'] == null){ //if the variables object is empty.
      results[0]['variables'] = new Object; // create the variables empty object
      results[0]['variables'][parseInt(sensor_type)] = payload ; // variable type = value
      sensorCollection.update({'_id' : _nodeid + "-" + sensor_id},results[0]  );
    }
    else if( results[0]['variables'][parseInt(sensor_type)] == null ){ // if variables object exists, but doesnt have that variable yet.
      results[0]['variables'][parseInt(sensor_type)] = payload ; // variable type = value
      sensorCollection.update({'_id' : _nodeid + "-" + sensor_id},results[0]  );
    }
    else if( results[0]['variables'][parseInt(sensor_type)] ){
      results[0]['variables'][parseInt(sensor_type)] = payload ; // variable type = value
      sensorCollection.update({'_id' : _nodeid + "-" + sensor_id},results[0]  );
    }
    mqttUtils.publish_nodes();
  });
}

/** Save a node battery version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} version - The node version.
 *  We don't really use this to be honest. I guess we could use it for hardware revisions.  
 */ 
function save_node_version(_nodeid,version){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'node_version' : version} });
    save_timestamp(_nodeid);
  });
}

/** Save a node library version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} libversion - The library version. 
 */ 
function save_node_lib_version(_nodeid,libversion){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'lib_version' : libversion} });
    save_timestamp(_nodeid);
  });
}

/** Save a node battery level.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {number} bat_level - Percentage of available battery life. 
 */ 
function save_node_battery_level(_nodeid,bat_level){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    
    if(bat_level == 0){
      nodeCollection.update( {'_id': _nodeid}, { $set: {'bat_level' : "none" } });
      nodeCollection.update( {'_id': _nodeid}, { $set: {'bat_powered' : false } });
    } else {
      nodeCollection.update( {'_id': _nodeid}, { $set: {'bat_level' : parseInt(bat_level)} });
      nodeCollection.update( {'_id': _nodeid}, { $set: {'bat_powered' : true} });
    }
    save_timestamp(_nodeid);
  });
}

/** Save a node name. Called on node init (presentation)
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} _node_name - The name of the node. 
 */ 
function save_node_name(_nodeid,_node_name){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'node_name' : _node_name} });
    logUtils.dblog('Saveing node name');
    if(results[0] == null){return;}
    if(results[0]['display_name'] == null){ // if it doesn't have a display name.
      logUtils.dblog('no display name');
      list_this_sensor_type = nodeCollection.find( { 'node_name' : _node_name } ).toArray();

      list_this_sensor_type.then(function(results){
        //console.log(results);
        var number_of_sensors = results.length;
          if(parseInt(number_of_sensors) > 0 ){
            console.log(_node_name + "-" + (number_of_sensors).toString() );
            nodeCollection.update( {'_id': _nodeid}, { $set: {'display_name' : _node_name + "-" + (number_of_sensors).toString()  } });
          } else{
            console.log('number 1');
            nodeCollection.update( {'_id': _nodeid}, { $set: {'display_name' : _node_name + '-' + '1' } }); // default name if its the first sensor of its type.
          }
      });
    }
    save_timestamp(_nodeid);
  });
}

function save_status_message(_nodeid,payload){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'current_status' : payload} });
    if(payload == "erase sensor"){
      nodeCollection.update( {'_id': _nodeid}, { $set: {'erased' : true} });
    }
    save_timestamp(_nodeid);
  });  
}

/** Rename a node. Updates display_name 
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} newName - the new display name for that node. 
 *  We can't just use node_name because it gets updated on node reboot, (presentation.)
*/
function update_node_display_name(_nodeid,newName){
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'display_name' : newName} });
  });
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  if (typeof nodeCollection == 'undefined'){return;}
  //Start with 1 for good measure. 
  num_nodes = nodeCollection.find( {'last_seen' : {$gt: 0} } ).count();
  num_nodes.then(function(value){      
    var nid =  (parseInt(value) + 1 );  
    var rightNow = Date.now();   
    //Build a blank node.
    var empty_node = { '_id' : nid,
                      'display_name':null,
                      'hb_freq' : 900000, //default to 15 minutes.
                      'bat_level' : null,
                      'bat_powered' : null,
                      'node_name' : null,
                      'node_version' : null,
                      'lib_version' : null,
                      'last_seen' : rightNow, 
                      'first_seen' : rightNow,                      
                      'alive' : true,
                      'erased' : false
                    };
    nodeCollection.save(empty_node);
    
    // send the id to the node itself. 
    var msg = myspacket.ms_encode(BROADCAST_ADDRESS, NODE_SENSOR_ID, C_INTERNAL, "0", I_ID_RESPONSE, nid);
    myspacket.ms_write_msg(msg);
    save_timestamp(nid);
  } );
}

module.exports = {
    check_node_alive : check_node_alive,
    save_timer : save_timer,
    save_alarm : save_alarm,
    save_timestamp : save_timestamp,
    save_sensor : save_sensor,
    save_sensor_value : save_sensor_value,
    update_sensor_display_name : update_sensor_display_name,
    save_node_version : save_node_version,
    save_node_lib_version : save_node_lib_version,
    save_node_battery_level : save_node_battery_level,
    save_node_name : save_node_name,
    update_node_display_name : update_node_display_name,
    sendNextAvailableSensorId : sendNextAvailableSensorId,
    save_status_message: save_status_message
}