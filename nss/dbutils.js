/*
* DATABASE THINGS FOR MYSENSORS.
*/

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

// Save a timer in the DB.
function save_timer( timer_to_save ){  
  // NO
}

// Save an alarm in the DB.
function save_alarm( alarm_to_save ){  
  // i quit.
}

/** Save a timestamp and make it apear alive.
 *  @param {number} _nodeid - the node on which this sensor resides.  
 */
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
    newSensor = { '_id': _nodeid + "-" + sensor_id, 'node_id':_nodeid, 'sensor_id': sensor_id, 'sensor_name': sensor_name, 'sensor_diaplay_name' : null, 'sensor_type': sensor_subtype,'variables':{} };
  }); 
}

/** Rename a sensor name for user readability.
 *  Similarly to node name, the regular sensor name gets updated on presentation, so if we want a readable name we make a new feild.
 *  @param {number} _nodeid - the node on which this sensor resides.
 *  @param {number} sensor_id - the id on _nodeid whose name to update.
 *  @param {string} new_name - the new name to store.
 */
function update_sensor_display_name(_nodeid, sensor_id, new_name){
  /** @TODO */
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
  mqttUtils.publish_nodes();
}

/** Save a node battery leve.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} version - The node version.
 *  We don't really use this to be honest. I guess we could use it for hardware revisions.  
 */ 
function save_node_version(_nodeid,version){
  nodeCollection.update( {'_id': _nodeid}, { $set: {'node_version' : version} } );
  save_timestamp(_nodeid);
}

/** Save a node battery leve.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} libversion - The library version. 
 */ 
function save_node_lib_version(_nodeid,libversion){
  nodeCollection.update( {'_id': _nodeid}, { $set: {'lib_version' : libversion} } );
  save_timestamp(_nodeid);
}

/** Save a node battery leve.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {number} bat_level - Percentage of available battery life. 
 */ 
function save_node_battery_level(_nodeid,bat_level){
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'bat_level' : parseInt(bat_level)} });
    save_timestamp(_nodeid);
  });
}

/** Save a node name. Called on node init (presentation)
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} node_name - The name of the node. 
 */ 
function save_node_name(_nodeid,node_name){
  logUtils.dblog('Saveing node name');
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'node_name' : node_name} });
    save_timestamp(_nodeid);
  });
}

/** Rename a node. Updates display_name 
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} newName - the new display name for that node. 
 *  We can't just use node_name because it gets updated on node reboot, (presentation.)
*/
function update_node_display_name(_nodeid,newName){
  nodeCursor = nodeCollection.find( {'_id' : _nodeid} ).toArray(function (err, results){
    nodeCollection.update( {'_id': _nodeid}, { $set: {'display_name' : newName} });
  });
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  //Start with 1 for good measure. 
  num_nodes = nodeCollection.count();
  num_nodes.then(function(value){      
    nid =  (parseInt(value) + 1 );     
    //Build a blank node.
    var empty_node = { '_id' : nid,
                      'display_name':null,
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
    sendNextAvailableSensorId : sendNextAvailableSensorId
}