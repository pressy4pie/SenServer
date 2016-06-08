/** 
* DATABASE THINGS FOR MYSENSORS.
* This file needs the most work L o L.
*/

/** Check to see if nodes are alive. This will loop thru all of the nodes in the db.  */
function check_node_alive(){
  db.nodes.find({ _id: {$gt : 0} }, function (err, docs) {
    for (node in docs){
      var thisNode = docs[parseInt(node)];
      /** if the node hasn't been seen in a longer amount of time than the hb_freq declare it dead.  */
      if( (Date.now() - thisNode['last_seen']) >= thisNode['hb_freq'] && ( thisNode['alive'] == true )){
        logUtils.dblog("node " + thisNode['_id'] + " Is declared dead!");
        db.nodes.update({ _id:thisNode['_id'] }, {$set : {alive: false} });
      } 
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
 *  @param {number} _nodeid - the node on which this sensor resides.  */
function save_timestamp(_nodeid){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    if(docs == null){return;}
    thisNode = docs[0]; 
    db.nodes.update({_id : _nodeid}, { $set : {"last_seen" : Date.now() } });
    if(thisNode['alive'] != true){ 
      logUtils.dblog("node " + _nodeid + " Is declared alive!");
      db.nodes.update({_id : _nodeid}, { $set : {"alive" : true } }); }
    db.nodes.persistence.compactDatafile();
  });  
}

// Save the sensor in the DB
function save_sensor(_nodeid, sensor_id, sensor_name, sensor_subtype){
  db.sensors.find({ _id: _nodeid + "-" + sensor_id }, function (err, docs) {
    /** if this document doesn't exist yet.  */
    if(docs[0] == null){
      newSensor = { '_id': _nodeid + "-" + sensor_id, 
        'node_id':_nodeid, 
        'sensor_id': sensor_id, 
        'sensor_name': sensor_name, 
        'sensor_display_name' : sensor_name, 
        'sensor_type': sensor_subtype,
      };
      /** This is to make sure we aren't saving a sensor on a node that does not exist.  */
      db.nodes.find({'_id' : _nodeid},function(err,node_docs){
        if(node_docs[0] != null){ 
          db.sensors.insert(newSensor);
        }
      });
    }
  });
}

/** Rename a sensor name for user readability.
 *  Similarly to node name, the regular sensor name gets updated on presentation, so if we want a readable name we make a new feild.
 *  @param {number} _nodeid - the node on which this sensor resides.
 *  @param {number} sensor_id - the id on _nodeid whose name to update.
 *  @param {string} new_name - the new name to store. */
function update_sensor_display_name(_nodeid, sensor_id, new_name){
  db.nodes.find({ _id: _nodeid }, function (err, node_docs) {
    db.sensors.find({ _id: _nodeid + "-" + sensor_id }, function (err, docs) {
      db.sensors.update({'_id' : _nodeid + "-" + sensor_id}, {$set: {sensor_display_name: new_name}}  );
      mqttUtils.publish_nodes(_nodeid);
    });
  });
}

/** Update the heartbeat frequency of a node
 * @param {number} _nodeid - the Id of the node to update.
 * @param {number} new_hb_freq - the new heartbeat frequency. */ 
function update_hb_frequency(_nodeid, new_hb_freq){
  db.nodes.find({ _id: _nodeid }, function (err, doc) {
    db.nodes.update( {_id : _nodeid}, { $set: { hb_freq : new_hb_freq } } );
    mqttUtils.publish_nodes(_nodeid);
  });  
}

/** Save the sensor to the database
 *  @param {number} _nodeid - The node that holds the sensor.
 *  @param {number} sensor_id - the sensor on that node.
 *  @param {number} sensor_type - the variable type. See mymessage.js.
 *  @param {string} payload - the payload to update. */
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  db.sensors.find({ _id: _nodeid + "-" + sensor_id }, function (err, docs) {
    var thisSensor = docs[0];
    /** Make sure this sensor exists. */
    if(thisSensor != null){
      /** If no variables exist. */
      if(thisSensor['variables'] == null){ //if the variables object is empty.
        thisSensor['variables'] = new Object; // create the variables empty object
        thisSensor['variables'][parseInt(sensor_type)] = payload ; // variable type = value
        db.sensors.update({'_id' : _nodeid + "-" + sensor_id}, thisSensor,{},function(){
          mqttUtils.publish_nodes(_nodeid);
        });
      }
      else if( thisSensor['variables'][parseInt(sensor_type)] == null ){ // if variables object exists, but doesnt have that variable yet.
        thisSensor['variables'][parseInt(sensor_type)] = payload ; // variable type = value
        db.sensors.update({'_id' : _nodeid + "-" + sensor_id}, thisSensor,{},function(){
          mqttUtils.publish_nodes(_nodeid);
        });
      }
      else if( thisSensor['variables'][parseInt(sensor_type)] ){
        thisSensor['variables'][parseInt(sensor_type)] = payload ; // variable type = value
        db.sensors.update({'_id' : _nodeid + "-" + sensor_id}, thisSensor,{},function(){
          mqttUtils.publish_nodes(_nodeid);
        });
      }
        save_timestamp(_nodeid);
    }
  });
}

/** Save a node battery version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} version - The node version.
 *  We don't really use this to be honest. I guess we could use it for hardware revisions.  */  
function save_node_version(_nodeid,node_version){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    thisNode = docs[0]; 
    db.nodes.update({_id : _nodeid}, { $set : {"node_version" : node_version } });
  });
}

/** Save a node library version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} libversion - The library version. */ 
function save_node_lib_version(_nodeid,libversion){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    thisNode = docs[0]; 
    db.nodes.update({_id : _nodeid}, { $set : {"lib_version" : libversion } });
  });
}

/** Save a node battery level.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {number} bat_level - Percentage of available battery life. */ 
function save_node_battery_level(_nodeid,bat_level){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    thisNode = docs[0]; 
    if(bat_level == 0){
      /** this is not a battery powered sensor. */
      db.nodes.update({_id : _nodeid}, { $set : {"bat_powered" : false } });
      db.nodes.update({_id : _nodeid}, { $set : {"bat_level" : -1 } });
    }else
      db.nodes.update({_id : _nodeid}, { $set : {"bat_level" : bat_level } });
      mqttUtils.publish_nodes(_nodeid);
  });
  save_timestamp(_nodeid);
}

/** Save a node name. Called on node init (presentation)
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} _node_name - The name of the node.  */ 
function save_node_name(_nodeid,_node_name){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    thisNode = docs[0]
    if(thisNode != null){
      save_timestamp(_nodeid);
      /** if we don't have a node name yet. */
      if(thisNode['node_name'] == null){
        db.nodes.update({_id : _nodeid}, { $set : {"node_name" : _node_name } });
        db.nodes.persistence.compactDatafile();
      }
      /** If we don't have a display name yet, create one.  */
      if(thisNode['display_name'] == null){
        db.nodes.count({ node_name : _node_name },function(err, count){
          var suffix = "-" + String(count);
          var node_display_name = _node_name + String(suffix);
          thisNode['display_name'] = node_display_name;
          update_node_display_name(_nodeid,node_display_name);
        });
      }
    }
});
}

/** Save a status message on a node.
 * @param {number} _nodeid - the id of the node to update.
 * @param {string} payload - the status of the node. */
function save_status_message(_nodeid,payload){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    db.nodes.update({_id : _nodeid}, { $set : {"status" : payload } });
    save_timestamp(_nodeid);  
    mqttUtils.publish_nodes(_nodeid);
  }); 
}

/** Rename a node. Updates display_name 
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} newName - the new display name for that node. 
 *  We can't just use node_name because it gets updated on node reboot, (presentation.) */
function update_node_display_name(_nodeid,newName){
  db.nodes.find({ _id: _nodeid }, function (err, docs) {
    db.nodes.update({_id : _nodeid}, { $set : {"display_name" : newName } });
  });
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  var num_nodes = db.nodes.count({},function (err,count){
    var nid = count + 1;
    logUtils.dblog("Assigning: " + nid);
    var rightNow = Date.now(); 
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
                      'status' : null,
                      'erased' : false
                     };
    /** Save the node. */
    db.nodes.insert(empty_node);
    // send the id to the node itself. 
    var msg = myspacket.ms_encode(BROADCAST_ADDRESS, NODE_SENSOR_ID, C_INTERNAL, "0", I_ID_RESPONSE, nid);
    myspacket.ms_write_msg(msg);                 
  });
}

module.exports = {
    /** timer and alarm stuff. */
    save_timer : save_timer,
    save_alarm : save_alarm,
    
    /** Node alive checker. */
    check_node_alive : check_node_alive,
    
    /** These don't really sort well. */
    save_timestamp : save_timestamp,
    sendNextAvailableSensorId : sendNextAvailableSensorId,
    
    /** Sensor Stuff */
    save_sensor : save_sensor,
    save_sensor_value : save_sensor_value,
    
    /** Update stuff. */
    update_sensor_display_name : update_sensor_display_name,
    update_node_display_name : update_node_display_name,
    update_hb_frequency : update_hb_frequency,
    
    /** save node information. */
    save_node_version : save_node_version,
    save_node_lib_version : save_node_lib_version,
    save_node_battery_level : save_node_battery_level,
    save_node_name : save_node_name,
    save_status_message: save_status_message
}