var mqtt = require('mqtt');
var client = mqtt.connect("ws://localhost:3002", {
});

client.subscribe("TEST_SERIAL_NUMBER");

function gets(topic, payload){
  console.log([topic, payload].join(": "))
  if(payload == 'test'){console.log("tortillas")}
  if(payload == 'ack'){
    client.publish(topic, "response");
    console.log('YOU SENT THE THING!!!!11!!1!!!');
  }
}
client.on("message", gets);