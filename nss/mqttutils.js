// This gets called when a new app connects to mqtt..
function publish_all(){
  logUtils.mqttlog('publishing all.');
  publish_nodes();
  publish_alarms();
  publish_timers();
  /** I'll probably remove this l8r. */
  mqtt_client.publish("/zc/" + serial_number + "/all/", 'all_done' );
}

// publish our nodes. 
function publish_nodes(specific_node){
  /** If we aren't publishing a specific_node, do all of them. */
  if(specific_node == null){
    // Get cursor for nodes with id greater than zero. 
    db.nodes.find( {} ,function(err, nodes){
      if (err) {logUtils.err(err);} 
      if ( nodes != null ) {
        nodes.forEach(function(list_item,node){
          var node_to_publish = nodes[node]; 
          db.sensors.find({'node_id': node_to_publish['_id'] },function(err, sensors){
            node_to_publish['sensors'] = sensors;
            mqtt_client.publish("/zc/" + serial_number + "/node/", JSON.stringify(node_to_publish) );
          });
        });
      }  
    }); 
  }else{
    // Get cursor for nodes with id greater than zero. 
    db.nodes.find( {_id:specific_node} ,function(err, nodes){
      if (err) {logUtils.err(err);} 
      if ( nodes != null ) {
        nodes.forEach(function(list_item,node){
          var node_to_publish = nodes[node]; 
          db.sensors.find({'node_id': node_to_publish['_id'] },function(err, sensors){
            node_to_publish['sensors'] = sensors;
            mqtt_client.publish("/zc/" + serial_number + "/node/", JSON.stringify(node_to_publish) );
          });
        });
      }  
    });     
  }
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
    
    conditional: { node_to_check : 1, // Node to check. 
                   sensor_to_check : 3, // Sensor on that node
                   value : 31135, // value to check against.
                   condition : 'gt' //greater than
                 },
    
    notify_email : [ 'bob@test.com' ], //list of emails to notify.
    execute : [{'node_id': 1, 'sensor_id' : 1, 'msg_cmd': 1, 'msg_type' : 29, 'payload': 1 }] // update node id 1, sensor id 1, of type 29, turn it on. 
  };
  
  //not working
  mqtt_client.publish("/zc/" + serial_number + "/alarm/", JSON.stringify(test_alarm) );
  mqtt_client.publish("/zc/" + serial_number + "/alarm/", 'done' );
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
  mqtt_client.publish("/zc/" + serial_number + "/timer/", JSON.stringify(test_timer_schedule) );  
  mqtt_client.publish("/zc/" + serial_number + "/timer/", JSON.stringify(test_timer_cron) );
  mqtt_client.publish("/zc/" + serial_number + "/timer/", 'done' );
}
module.exports = {
  publish_all    : publish_all,
  publish_nodes  : publish_nodes,
  publish_alarms : publish_alarms,
  publish_timers : publish_timers,
}