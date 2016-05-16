var mqtt = require('mqtt');
const cloud_mqtt_server = "10.0.0.134:3002"
const local_mqtt_server = "localhost:3002"
//if (internet?){
var client = mqtt.connect("ws:" + cloud_mqtt_server, {});
//else var client = var client = mqtt.connect("ws:" + local_mqtt_server, {});

client.subscribe("SERIAL NUMBER");

function gets(topic, payload){
  console.log([topic, payload].join(": "))
  if(payload == 'test'){console.log("tortillas")}
  if(payload == 'ack'){
    client.publish(topic, "response");
    console.log('YOU SENT THE THING!!!!11!!1!!!');
  }
}