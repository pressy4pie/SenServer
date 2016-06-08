/** 
* DATABASE THINGS FOR MYSENSORS.
* This file needs the most work L o L.
*/

/** Check to see if nodes are alive. This will loop thru all of the nodes in the db.  */
function check_node_alive(){
  /** TODO */
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
  /** TODO */
}

// Save the sensor in the DB
function save_sensor(_nodeid, sensor_id, sensor_name, sensor_subtype){
  /** TODO */
}

/** Rename a sensor name for user readability.
 *  Similarly to node name, the regular sensor name gets updated on presentation, so if we want a readable name we make a new feild.
 *  @param {number} _nodeid - the node on which this sensor resides.
 *  @param {number} sensor_id - the id on _nodeid whose name to update.
 *  @param {string} new_name - the new name to store. */
function update_sensor_display_name(_nodeid, sensor_id, new_name){
  /** TODO */
  save_timestamp(_nodeid);
  mqttUtils.publish_nodes();
}

/** Save the sensor to the database
 *  @param {number} _nodeid - The node that holds the sensor.
 *  @param {number} sensor_id - the sensor on that node.
 *  @param {number} sensor_type - the variable type. See mymessage.js.
 *  @param {string} payload - the payload to update. */
function save_sensor_value(_nodeid, sensor_id, sensor_type, payload){
  /** TODO */
  save_timestamp(_nodeid);
  mqttUtils.publish_nodes();
}

/** Save a node battery version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} version - The node version.
 *  We don't really use this to be honest. I guess we could use it for hardware revisions.  
 */ 
function save_node_version(_nodeid,version){
  /** TODO */
  save_timestamp(_nodeid);
}

/** Save a node library version.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {string} libversion - The library version. 
 */ 
function save_node_lib_version(_nodeid,libversion){
  /** TODO */
  save_timestamp(_nodeid);
}

/** Save a node battery level.
 *  @param {number} _nodeid - The node whose name to update.
 *  @param {number} bat_level - Percentage of available battery life. 
 */ 
function save_node_battery_level(_nodeid,bat_level){
  /** TODO */
  save_timestamp(_nodeid);
}

/** Save a node name. Called on node init (presentation)
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} _node_name - The name of the node. 
 */ 
function save_node_name(_nodeid,_node_name){
  /** TODO */
  save_timestamp(_nodeid);
}

function save_status_message(_nodeid,payload){
  /** TODO */
  save_timestamp(_nodeid); 
}

/** Rename a node. Updates display_name 
 *  @param {number} _nodeid - the node whose name to update.
 *  @param {string} newName - the new display name for that node. 
 *  We can't just use node_name because it gets updated on node reboot, (presentation.)
*/
function update_node_display_name(_nodeid,newName){
  /** TODO */
}

// Give a new node an ID. 
function sendNextAvailableSensorId() {
  /** TODO */
    var nid = NUMBER_OF_NODES + 1
    // send the id to the node itself. 
    var msg = myspacket.ms_encode(BROADCAST_ADDRESS, NODE_SENSOR_ID, C_INTERNAL, "0", I_ID_RESPONSE, nid);
    myspacket.ms_write_msg(msg);
    save_timestamp(nid);
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