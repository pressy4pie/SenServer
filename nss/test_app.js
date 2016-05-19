var mqtt = require('mqtt');
const cloud_mqtt_server = "10.0.0.134:3002";
const serial_number = "test_serial";
var mqtt_client = mqtt.connect("ws:" + cloud_mqtt_server, {});
var express = require('express');
var app = express();

//empty list of nodes. 
var node_list = {};

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


mqtt_client.subscribe('/zc/' + serial_number + '/#' );

mqtt_client.on('connect', () => {  
  console.log('Connected to mqtt.');
});

mqtt_client.on('message', function (topic, message) {
    switch(topic){
        case '/zc/' + serial_number + '/node/':
            // make a json of the json. 
            raw_msg = message.toString();
            var node = JSON.parse(raw_msg);
            //console.log(JSON.stringify(node));
            
            //add it to our list. 
            node_list["node"+node.id] = node           
            break;
    }
});

app.get('/get_nodes', function(req, res) {
    mqtt_client.publish('/zc/' + serial_number + '/get_nodes/', "");
    console.log('getting nodes. ')
    res.send(JSON.stringify(node_list,null,4));
});