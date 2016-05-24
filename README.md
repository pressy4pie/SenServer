There are two main packages in this repository. 

NSS
======
Node-SenServer. 
This is the application that communicates with EKG Sensors through serial over NRF24 radios.
Has other features being worked on such as: 
* Database
* Web back/Front end
* Timers and Alarms per Sensor. 
* MQTT over websockets. 

To Start: 
```bash
$ git clone https://github.com/pressy4pie/SenServer.git SenServer
$ cd SenServer/nss
$ npm install
$ node index.js
```
 
note: 
* Make sure you have mongodb running.
* Make sure you have a mqtt broker to connect to. The bundled one from @FarmBot works great :+1: 
* Make sure you have a MySensors Serial Gateway on noted port. (usually `/dev/ttyACM0` on linux)

test_app
======
Exactly that. Just a test app.
Features:
* Pure html/js.
* uh
* it sux.

To Start:
```bash
$ cd test_app
$ npm install serve -g
$ serve
```
Then you may laugh at my lack of design skills.

mqtt-broker
======
The most stable part of this entire project because it was written by a smart dude. Thanks to @FarmBot.
Eventually I'll Make my own but this one works and is simple, so here it is. 
Get it at [Farmbot's Github]
[Farmbot's Github]: https://github.com/FarmBot/mqtt-gateway

To Start: 
```bash
$ npm install
$ node index.js
```
