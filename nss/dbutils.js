/** 
* DATABASE THINGS FOR MYSENSORS.
* This file needs the most work L o L.
*/

/** Check to see if nodes are alive. This will loop thru all of the nodes in the db.  */
function check_node_alive(){
  nodeCollection.find({_id : {$gt : 0}}).toArray(function(err, results){
    results.forEach(function(node, index){
      if((Date.now() - node['last_seen']) > node['hb_freq']){
        nodeCollection.update({_id : _nodeid}, {$set : {alive : false}});
      }
    });
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
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {last_seen : Date.now()}});
  });
}

// Save the sensor in the DB
function save_sensor(_nodeid, sensor_id, sensor_name, sensor_subtype){
  sensorCollection.findOne({_id : _nodeid + "-" + sensor_id },function(err, item) {
    if(item == null){
      newSensor = { '_id': _nodeid + "-" + sensor_id, 
        'node_id':_nodeid, 
        'sensor_id': sensor_id, 
        'sensor_name': sensor_name, 
        'sensor_display_name' : sensor_name, 
        'sensor_type': sensor_subtype,
      };
      sensorCollection.save(newSensor); 
    }
  });
}

/** Rename a sensor name for user readability.
 *  Similarly to node name, the regular sensor name gets updated on presentation, so if we want a readable name we make a new feild.
 *  @param {number} _nodeid - the node on which this sensor resides.
 *  @param {number} sensor_id - the id on _nodeid whose name to update.
 *  @param {string} new_name - the new name to store. */
function update_sensor_display_name(_nodeid, sensor_id, new_name){
  /** TODO */
  save_timestamp(_nodeid);
  mqttUtils.publish_nodes(_nodeid);
}

/** Save the sensor to the database
 *  @param {number} _nodeid - The node that holds the sensor.
 *  @param {number} sensor_id - the sensor on that node.
 *  @param {number} sensor_type - the variable type. See mymessage.js.
 *  @param {string} payload - the payload to update. */
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  sensorCollection.findOne( {_id : _nodeid + "-" + sensor_id },function(err, item) {
    if(err){console.log(err);}
    if(item == null){ return; }
    
    // No variables yet. 
    if(item['variables'] == null){
     item['variables'] = new Object;
     item['variables'][parseInt(sensor_type)] = payload;
    }
    // Some variables exist, but not this one. 
    else if( item['variables'][sensor_type] == null ){
      item['variables'][parseInt(sensor_type)] = payload;
    }
    // This variable exists, update it. 
    else{
      item['variables'][parseInt(sensor_type)] = payload;
    }
    sensorCollection.update({_id : _nodeid + "-" + sensor_id }, item);
    save_timestamp(_nodeid);
    mqttUtils.publish_nodes(_nodeid);
  });  
}

/** Save a node version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} version - The node version.
 *  We don't really use this to be honest. I guess we could use it for hardware revisions.  
 */ 
function save_node_version(_nodeid,node_version){
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {node_version : node_version}});
  });
}

/** Save a node library version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} lib_version - The library version. 
 */ 
function save_node_lib_version(_nodeid,lib_version){
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {lib_version : lib_version}});
  });
}

/** Save a node battery level.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {number} bat_level - Percentage of available battery life. 
 */ 
function save_node_battery_level(_nodeid,bat_level){
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {bat_level : bat_level}});
    if(item['bat_powered'] != true && bat_level == 0){
      nodeCollection.update({_id : _nodeid}, {$set : {bat_powered : false}});
    }
  });
}

/** Save a node name. Called on node init (presentation)
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} _node_name - The name of the node. 
 */ 
function save_node_name(_nodeid,_node_name){  
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {node_name : _node_name}});
    if(item['display_name'] == null){
      nodeCollection.update({_id : _nodeid}, {$set : {display_name : _node_name}});
    }
  });
}

function save_status_message(_nodeid,status){
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {status : status}});
  });
}

/** Rename a node. Updates display_name 
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} newName - the new display name for that node. 
 *  We can't just use node_name because it gets updated on node reboot, (presentation.)
*/
function update_node_display_name(_nodeid,newName){
  nodeCollection.findOne({_id : _nodeid },function(err, item) {
    nodeCollection.update({_id : _nodeid}, {$set : {'display_name' : newName}});
  });
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  if (typeof nodeCollection == 'undefined'){return;}
  nodeCollection.find({_id : {$gt : 0}}).toArray(function(err, results){
    if(err){ console.log(err);}
    nid = results.length + 1;
    console.log(results);
   
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
  }); 
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