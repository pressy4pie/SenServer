/** 
* DATABASE THINGS FOR MYSENSORS.
* This file needs the most work L o L.
*/

/** Check to see if nodes are alive. This will loop thru all of the nodes in the db.  */
function check_node_alive(){
  db.serialize(function(){
    db.each("SELECT * FROM nodes ",{},function(err,results){
      if(err){console.log(err);}
      if(results == null){return;}
      if((Date.now() - results['last_seen']  ) > results['hb_freq']){
        console.log('node: ' + results['_id'] +  ' is declared dead');
        db.run("UPDATE nodes SET alive = $alive WHERE _id = $_id",{
          $alive : false,
          $_id : _nodeid
        });
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
 *  @param {number} _nodeid - the node on which this sensor resides.  */
function save_timestamp(_nodeid){
  db.serialize(function(){
    db.run("UPDATE nodes SET last_seen = $last_seen WHERE _id = $_id",{
      $last_seen : Date.now(),
      $_id : _nodeid
    });
  });
}

// Save the sensor in the DB
function save_sensor(_nodeid, sensor_id, sensor_name, sensor_subtype){
  db.serialize(function(){
    db.get("SELECT * FROM sensors WHERE _id= $_id",{$_id: _nodeid + "-" + sensor_id },function(err,results){
      if(err){console.log( err);}
      if(results == null){
        db.run("INSERT INTO sensors (_id, node_id, sensor_id, sensor_name, sensor_type, sensor_display_name) VALUES ($_id, $node_id, $sensor_id,$sensor_name,$sensor_type, $sensor_display_name )", {
          $_id : _nodeid + "-" + sensor_id,
          $node_id : _nodeid,
          $sensor_id : sensor_id,
          $sensor_name : sensor_name,
          $sensor_display_name : sensor_name,
          $sensor_type : sensor_subtype
        }); 
      }
    });
  });    
}

/** Rename a sensor name for user readability.
 *  Similarly to node name, the regular sensor name gets updated on presentation, so if we want a readable name we make a new feild.
 *  @param {number} _nodeid - the node on which this sensor resides.
 *  @param {number} sensor_id - the id on _nodeid whose name to update.
 *  @param {string} new_name - the new name to store. */
function update_sensor_display_name(_nodeid, sensor_id, new_name){
}

/** Update the heartbeat frequency of a node
 * @param {number} _nodeid - the Id of the node to update.
 * @param {number} new_hb_freq - the new heartbeat frequency. */ 
function update_hb_frequency(_nodeid, new_hb_freq){
  db.serialize(function(){
    db.run("UPDATE nodes SET hb_freq = $hb_freq WHERE _id = $_id",{
      $hb_freq : new_hb_freq,
      $_id : _nodeid
    });
  });
}

/** Save the sensor to the database
 *  @param {number} _nodeid - The node that holds the sensor.
 *  @param {number} sensor_id - the sensor on that node.
 *  @param {number} sensor_type - the variable type. See mymessage.js.
 *  @param {string} payload - the payload to update. */
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  save_timestamp(_nodeid);
  nsid = _nodeid +"-"+ sensor_id;
  var this_value = JSON.stringify({[sensor_type]: payload});
  db.serialize(function(){
    db.get("SELECT variables FROM sensors WHERE _id = $_id",{
      $_id : _nodeid +"-"+ sensor_id 
    },function(err, variables) {
      if(err){console.log(err);}
      if(variables == null){ return;}
      if(variables['variables'] == null){
        db.run("UPDATE sensors SET variables = $var_value WHERE _id = $_id",{
          $var_value : "[" +  this_value + "]",
          $_id : nsid
        });
      } else {
        
      }
    });
  });
  mqttUtils.publish_nodes(_nodeid);
}

/** Save a node battery version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} version - The node version.
 *  We don't really use this to be honest. I guess we could use it for hardware revisions.  */  
function save_node_version(_nodeid,node_version){
  db.serialize(function(){
    db.run("UPDATE nodes SET node_version = $node_version WHERE _id = $_id",{
      $node_version : node_version,
      $_id : _nodeid
    });
  });
}

/** Save a node library version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} libversion - The library version. */ 
function save_node_lib_version(_nodeid,libversion){
  db.serialize(function(){
    db.run("UPDATE nodes SET lib_version = $libversion WHERE _id = $_id",{
      $libversion : libversion,
      $_id : _nodeid
    });
  });
}

/** Save a node battery level.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {number} bat_level - Percentage of available battery life. */ 
function save_node_battery_level(_nodeid,bat_level){
  if(bat_level == 0){
    /** this is not a battery powered sensor. */
    db.serialize(function(){
      db.run("UPDATE nodes SET bat_level = $bat_level,bat_powered = $bat_powered WHERE _id = $_id",{
        $bat_level : bat_level,
        $bat_powered : false,
        $_id : _nodeid
      });
    });
  }else{
    db.serialize(function(){
      db.run("UPDATE nodes SET bat_level = $bat_level,bat_powered = $bat_powered WHERE _id = $_id",{
        $bat_level : bat_level,
        $bat_powered : true,
        $_id : _nodeid
      });
    });    
  }
}

/** Save a status message on a node.
 * @param {number} _nodeid - the id of the node to update.
 * @param {string} payload - the status of the node. */
function save_status_message(_nodeid,statusmsg){
  db.serialize(function(){
    db.run("UPDATE nodes SET status = $status WHERE _id = $_id",{
      $status : statusmsg,
      $_id : _nodeid
    });
  });
}

/** Save a node name. Called on node init (presentation)
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} _node_name - The name of the node.  */ 
function save_node_name(_nodeid,_node_name){
  db.serialize(function(){
    db.run("UPDATE nodes SET node_name = $node_name WHERE _id = $_id",{
      $node_name : _node_name,
      $_id : _nodeid
    });
    db.get("SELECT display_name FROM nodes WHERE _id=$_id", {
      $_id : _nodeid
    },function(err,results){
      if(err){console.log('error: ', err);}
      if(results == null){ return; }
      if(results['display_name'] == null){
        update_node_display_name(_nodeid, _node_name );
      }
    });
  });
}

/** Rename a node. Updates display_name 
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} newName - the new display name for that node. 
 *  We can't just use node_name because it gets updated on node reboot, (presentation.) */
function update_node_display_name(_nodeid,newName){
  db.serialize(function(){
    db.run("UPDATE nodes SET display_name = $display_name WHERE _id = $_id",{
      $display_name : newName,
      $_id : _nodeid
    });
  });  
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  db.serialize(function(){
    db.each("SELECT Count(_id) FROM nodes",function(err,rows){
      if(err){ console.log ("error: " + err);}
      var nid = rows["Count(_id)"];
      nid++;
      var rightNow = Date.now();
      db.run("INSERT INTO nodes (_id,hb_freq,last_seen,first_seen,alive,erased) VALUES ($_id, $hb_freq, $last_seen, $first_seen,$alive,$erased)", {
        $_id : nid,
        $hb_freq : 900000,
        $last_seen : rightNow,
        $first_seen : rightNow,
        $alive : true,
        $erased : false
      });
      logUtils.dblog('assigning node id: ' + nid);
      // send the id to the node itself. 
      var msg = myspacket.ms_encode(BROADCAST_ADDRESS, NODE_SENSOR_ID, C_INTERNAL, "0", I_ID_RESPONSE, nid);
      myspacket.ms_write_msg(msg);        
    });
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